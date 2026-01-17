import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { randomBytes } from 'crypto'

// GET - Төслийн багийн гишүүдийг авах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    // Багийн гишүүд
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        user:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('project_id', projectId)
      .in('status', ['active', 'pending'])
      .order('role', { ascending: true })

    if (membersError) throw membersError

    // Хүлээгдэж буй урилгууд
    const { data: invitations, error: invError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('project_id', projectId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())

    if (invError) throw invError

    return NextResponse.json({
      members: members || [],
      invitations: invitations || []
    })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

// POST - Шинэ гишүүн урих
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { project_id, email, role = 'member', permissions, invited_by } = body

    if (!project_id || !email || !invited_by) {
      return NextResponse.json({ error: 'project_id, email, and invited_by are required' }, { status: 400 })
    }

    // Урилга илгээгч owner эсвэл admin мөн эсэх шалгах
    const { data: inviter } = await supabase
      .from('team_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', invited_by)
      .eq('status', 'active')
      .single()

    if (!inviter || (inviter.role !== 'owner' && inviter.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized to invite members' }, { status: 403 })
    }

    // Аль хэдийн багийн гишүүн мөн эсэх шалгах (email-ээр)
    const { data: existingUser } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('project_id', project_id)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a team member' }, { status: 400 })
      }
    }

    // Хүлээгдэж буй урилга байгаа эсэх
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('project_id', project_id)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this email' }, { status: 400 })
    }

    // Урилгын токен үүсгэх
    const token = randomBytes(32).toString('hex')

    // Урилга үүсгэх
    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .insert({
        project_id,
        email,
        role,
        permissions: permissions || {
          view: true,
          edit: false,
          manage_orders: role === 'admin',
          manage_customers: role === 'admin',
          reply_messages: true,
          manage_products: role === 'admin',
          manage_settings: false
        },
        token,
        invited_by
      })
      .select()
      .single()

    if (error) throw error

    // TODO: Имэйл илгээх (Resend, SendGrid гэх мэт)
    // Одоогоор урилга линк буцаана
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    return NextResponse.json({
      invitation,
      invite_url: inviteUrl
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

// PATCH - Гишүүний эрх өөрчлөх
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { member_id, role, permissions, status, requester_id } = body

    if (!member_id || !requester_id) {
      return NextResponse.json({ error: 'member_id and requester_id are required' }, { status: 400 })
    }

    // Өөрчлөх гишүүний мэдээлэл
    const { data: member } = await supabase
      .from('team_members')
      .select('project_id, role')
      .eq('id', member_id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Хүсэлт илгээгчийн эрх шалгах
    const { data: requester } = await supabase
      .from('team_members')
      .select('role')
      .eq('project_id', member.project_id)
      .eq('user_id', requester_id)
      .eq('status', 'active')
      .single()

    if (!requester || requester.role !== 'owner') {
      // Зөвхөн owner эрх өөрчилж чадна
      if (role || status === 'removed') {
        return NextResponse.json({ error: 'Only owner can change roles or remove members' }, { status: 403 })
      }
    }

    // Owner-г устгах, role өөрчлөхийг хориглох
    if (member.role === 'owner' && (role || status === 'removed')) {
      return NextResponse.json({ error: 'Cannot modify owner role' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (role) updateData.role = role
    if (permissions) updateData.permissions = permissions
    if (status) updateData.status = status

    const { data: updated, error } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', member_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE - Урилга цуцлах
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('invitation_id')

    if (!invitationId) {
      return NextResponse.json({ error: 'invitation_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting invitation:', error)
    return NextResponse.json({ error: 'Failed to delete invitation' }, { status: 500 })
  }
}
