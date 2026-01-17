import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// POST - Урилга хүлээн авах
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { token, user_id } = body

    if (!token || !user_id) {
      return NextResponse.json({ error: 'token and user_id are required' }, { status: 400 })
    }

    // Урилга олох
    const { data: invitation, error: invError } = await supabase
      .from('team_invitations')
      .select('*, projects(name)')
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Хэрэглэгчийн имэйл шалгах
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id)

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.user?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        error: 'This invitation was sent to a different email address'
      }, { status: 400 })
    }

    // Аль хэдийн гишүүн мөн эсэх
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('project_id', invitation.project_id)
      .eq('user_id', user_id)
      .single()

    if (existingMember) {
      // Урилгыг accepted болгох
      await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id)

      return NextResponse.json({
        message: 'You are already a member of this project',
        project_id: invitation.project_id
      })
    }

    // Team member үүсгэх
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        project_id: invitation.project_id,
        user_id: user_id,
        role: invitation.role,
        permissions: invitation.permissions,
        invited_by: invitation.invited_by,
        status: 'active',
        accepted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (memberError) throw memberError

    // Урилгыг accepted болгох
    await supabase
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return NextResponse.json({
      member,
      project_id: invitation.project_id,
      project_name: invitation.projects?.name,
      message: 'Successfully joined the team'
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 })
  }
}

// GET - Урилгын мэдээлэл авах (token-оор)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 })
    }

    const { data: invitation, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        projects (
          name,
          industry
        )
      `)
      .eq('token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      project_name: invitation.projects?.name,
      project_industry: invitation.projects?.industry,
      expires_at: invitation.expires_at
    })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 })
  }
}
