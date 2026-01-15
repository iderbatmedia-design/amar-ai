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

    // 4. Research Engine ажиллуулах
    const researchResult = await runResearchEngine({
      name: project.name,
      industry: project.industry || '',
      description: project.description || '',
      products: products || [],
      brandProfile: brandProfile || undefined
    })

    // 5. Research data хадгалах
    const { error: updateError } = await supabase
      .from('research_data')
      .upsert({
        project_id,
        competitor_analysis: researchResult.key_selling_points,
        market_insights: researchResult.target_customers,
        recommended_responses: researchResult.common_questions,
        ai_instructions: JSON.stringify(researchResult),
        last_research_at: new Date().toISOString()
      }, {
        onConflict: 'project_id'
      })

    if (updateError) {
      console.error('Error saving research:', updateError)
    }

    return NextResponse.json({
      success: true,
      research: researchResult
    })

  } catch (error) {
    console.error('Research API error:', error)
    return NextResponse.json({ error: 'Research failed' }, { status: 500 })
  }
}
