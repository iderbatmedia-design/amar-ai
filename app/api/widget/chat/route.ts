import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runSalesAgent } from '@/app/lib/openai'

// Widget-ээс ирсэн чат хүсэлт
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    const { project_id, session_id, message, visitor_info } = body

    if (!project_id || !message) {
      return NextResponse.json({ error: 'project_id and message required' }, { status: 400 })
    }

    // 1. Project шалгах
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('id', project_id)
      .single()

    if (projectError || !project || project.status !== 'active') {
      return NextResponse.json({ error: 'Project not found or inactive' }, { status: 404 })
    }

    // 2. Research data авах
    const { data: researchData } = await supabase
      .from('research_data')
      .select('ai_instructions')
      .eq('project_id', project_id)
      .single()

    if (!researchData?.ai_instructions) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 400 })
    }

    // 3. Session/Customer олох эсвэл үүсгэх
    let customerId = null
    let conversationId = null
    let conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []

    if (session_id) {
      // Байгаа session хайх
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, customer_id, messages')
        .eq('project_id', project_id)
        .eq('platform', 'web')
        .eq('platform_conversation_id', session_id)
        .single()

      if (conversation) {
        conversationId = conversation.id
        customerId = conversation.customer_id
        conversationHistory = conversation.messages || []
      }
    }

    // Шинэ visitor бол customer үүсгэх
    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          project_id,
          platform: 'web',
          platform_user_id: session_id || `web_${Date.now()}`,
          name: visitor_info?.name || 'Web Visitor',
          lead_score: 'cold'
        })
        .select()
        .single()

      if (newCustomer) {
        customerId = newCustomer.id
      }
    }

    // Шинэ харилцаа үүсгэх
    if (!conversationId && customerId) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          project_id,
          customer_id: customerId,
          platform: 'web',
          platform_conversation_id: session_id || `web_${Date.now()}`,
          status: 'active',
          messages: []
        })
        .select()
        .single()

      if (newConversation) {
        conversationId = newConversation.id
      }
    }

    // 4. Base knowledge авах
    const { data: baseKnowledge } = await supabase
      .from('ai_base_knowledge')
      .select('content')
      .eq('is_active', true)
      .in('category', ['sales', 'general'])
      .order('priority', { ascending: false })
      .limit(10)

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

    // 5. Products авах
    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, price, features, stock, images')
      .eq('project_id', project_id)
      .eq('is_active', true)

    // 6. AI Sales Agent ажиллуулах
    const aiResponse = await runSalesAgent({
      researchData: JSON.parse(researchData.ai_instructions),
      conversationHistory,
      customerMessage: message,
      customerInfo: visitor_info ? { name: visitor_info.name } : undefined,
      baseKnowledge: baseKnowledgeText,
      products: products || []
    })

    // 7. Хариуг задлах
    const responseMessage = typeof aiResponse === 'string' ? aiResponse : aiResponse.message
    const imagesToSend = typeof aiResponse === 'string' ? [] : (aiResponse.images_to_send || [])

    // 8. Харилцааг шинэчлэх
    const newMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: responseMessage }
    ]

    if (conversationId) {
      await supabase
        .from('conversations')
        .update({
          messages: newMessages,
          last_message_at: new Date().toISOString(),
          message_count: newMessages.length
        })
        .eq('id', conversationId)
    }

    // Customer-ийн lead score шинэчлэх
    if (customerId && conversationHistory.length > 2) {
      await supabase
        .from('customers')
        .update({
          lead_score: 'warm',
          last_interaction_at: new Date().toISOString()
        })
        .eq('id', customerId)
    }

    return NextResponse.json({
      success: true,
      response: responseMessage,
      images: imagesToSend,
      session_id: session_id || conversationId
    })

  } catch (error) {
    console.error('Widget chat error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
