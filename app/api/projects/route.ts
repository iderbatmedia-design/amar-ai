import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// GET - Бүх projects авах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Auth header-ээс user авах
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST - Шинэ project үүсгэх
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { user_id, name, industry, description, ai_name, ai_tone } = body

    if (!user_id || !name) {
      return NextResponse.json(
        { error: 'user_id and name are required' },
        { status: 400 }
      )
    }

    // 1. Project үүсгэх
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id,
        name,
        industry: industry || null,
        description: description || null,
        ai_name: ai_name || 'AI Туслах',
        ai_tone: ai_tone || 'friendly',
        status: 'active'
      })
      .select()
      .single()

    if (projectError) throw projectError

    // 2. Research data-н хоосон бичлэг үүсгэх
    const { error: researchError } = await supabase
      .from('research_data')
      .insert({
        project_id: project.id
      })

    if (researchError) {
      console.error('Error creating research data:', researchError)
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
