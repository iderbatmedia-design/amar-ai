import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runAICoach } from '@/app/lib/openai'

// GET - Өмнөх чатын түүх авах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const { data: messages, error } = await supabase
      .from('ai_coach_messages')
      .select('*')
      .eq('project_id', project_id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(messages || [])
  } catch (error) {
    console.error('Error fetching coach messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST - AI Coach-той чатлах
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { project_id, message } = await request.json()

    if (!project_id || !message) {
      return NextResponse.json({ error: 'project_id and message required' }, { status: 400 })
    }

    // 1. Project мэдээлэл авах
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // 2. Research data авах
    const { data: researchData } = await supabase
      .from('research_data')
      .select('*')
      .eq('project_id', project_id)
      .single()

    // 3. Өмнөх чатын түүх авах
    const { data: previousMessages } = await supabase
      .from('ai_coach_messages')
      .select('role, content')
      .eq('project_id', project_id)
      .order('created_at', { ascending: true })
      .limit(20)

    // 4. Analytics авах
    const { data: analytics } = await supabase
      .from('daily_analytics')
      .select('*')
      .eq('project_id', project_id)
      .order('date', { ascending: false })
      .limit(7)

    // 5. Хэрэглэгчийн мессежийг хадгалах
    await supabase
      .from('ai_coach_messages')
      .insert({
        project_id,
        role: 'user',
        content: message
      })

    // 6. AI Coach ажиллуулах
    const aiResponse = await runAICoach({
      projectData: {
        ...project,
        research: researchData
      },
      conversationHistory: (previousMessages || []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      userMessage: message,
      analyticsData: analytics
    })

    // 7. AI хариултыг хадгалах
    await supabase
      .from('ai_coach_messages')
      .insert({
        project_id,
        role: 'assistant',
        content: aiResponse
      })

    return NextResponse.json({
      success: true,
      response: aiResponse
    })

  } catch (error) {
    console.error('Coach API error:', error)
    return NextResponse.json({ error: 'Coach chat failed' }, { status: 500 })
  }
}
