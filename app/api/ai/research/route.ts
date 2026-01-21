import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runResearchEngine } from '@/app/lib/openai'

// POST - Research Engine ажиллуулах
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { project_id } = await request.json()

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    // 1. Project мэдээлэл авах
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 2. Бүтээгдэхүүнүүд авах
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('project_id', project_id)

    // 3. Brand profile авах
    const { data: brandProfile } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('project_id', project_id)
      .single()

    // 4. Admin-ий сургасан research мэдлэг авах
    const { data: baseKnowledge } = await supabase
      .from('ai_base_knowledge')
      .select('content')
      .eq('is_active', true)
      .in('category', ['research', 'general'])
      .order('priority', { ascending: false })
      .limit(10)

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

    console.log('Base knowledge for research:', baseKnowledgeText) // Debug log

    // 5. Research Engine ажиллуулах
    const researchResult = await runResearchEngine({
      name: project.name,
      industry: project.industry || '',
      description: project.description || '',
      products: products || [],
      brandProfile: brandProfile || undefined,
      baseKnowledge: baseKnowledgeText
    })

    // Brand profile-аас website_url-ийг ЗААВАЛ авах (AI-аас ирсэн биш бизнес эзний оруулсан нь зөв)
    if (brandProfile?.website_url) {
      researchResult.website_url = brandProfile.website_url
    }

    // 6. Research data хадгалах
    console.log('Saving research for project:', project_id)
    console.log('Research result:', JSON.stringify(researchResult).substring(0, 200))

    // Эхлээд байгаа эсэхийг шалгах
    const { data: existingResearch } = await supabase
      .from('research_data')
      .select('id')
      .eq('project_id', project_id)
      .single()

    let savedData
    let saveError

    if (existingResearch) {
      // Update existing
      const { data, error } = await supabase
        .from('research_data')
        .update({
          ai_instructions: JSON.stringify(researchResult),
          last_research_at: new Date().toISOString()
        })
        .eq('project_id', project_id)
        .select()
        .single()

      savedData = data
      saveError = error
      console.log('Updated existing research:', savedData?.id)
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('research_data')
        .insert({
          project_id,
          ai_instructions: JSON.stringify(researchResult),
          last_research_at: new Date().toISOString()
        })
        .select()
        .single()

      savedData = data
      saveError = error
      console.log('Inserted new research:', savedData?.id)
    }

    if (saveError) {
      console.error('Error saving research:', saveError)
      return NextResponse.json({
        error: 'Failed to save research',
        details: saveError
      }, { status: 500 })
    }

    console.log('Research saved successfully:', savedData)

    return NextResponse.json({
      success: true,
      research: researchResult
    })

  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json({ error: 'Research failed' }, { status: 500 })
  }
}
