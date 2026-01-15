import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

// GET - AI бэлэн эсэхийг шалгах
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    // Research data байгаа эсэхийг шалгах
    const { data: researchData } = await supabase
      .from('research_data')
      .select('ai_instructions, last_research_at')
      .eq('project_id', project_id)
      .single()

    const isReady = !!researchData?.ai_instructions

    return NextResponse.json({
      ready: isReady,
      last_trained: researchData?.last_research_at || null
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({ ready: false })
  }
}
