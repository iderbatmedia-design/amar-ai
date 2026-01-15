import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runSalesAgent } from '@/app/lib/openai'

// POST - AI Sales Agent-тай чатлах
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { project_id, conversation_id, message, customer_id } = await request.json()

    if (!project_id || !message) {
      return NextResponse.json({ error: 'project_id and message required' }, { status: 400 })
    }

    // 1. Research data авах (AI-н мэдлэг)
    const { data: researchData } = await supabase
      .from('research_data')
      .select('ai_instructions')
      .eq('project_id', project_id)
      .single()

    if (!researchData?.ai_instructions) {
      return NextResponse.json({
        error: 'AI not trained yet. Please run research first.',
        code: 'NO_RESEARCH'
      }, { status: 400 })
    }

    // 2. Харилцааны түүх авах
    let conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []

    if (conversation_id) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversation_id)
        .single()

      if (conversation?.messages) {
        conversationHistory = conversation.messages
      }
    }

    // 3. Харилцагчийн мэдээлэл авах
    let customerInfo
    if (customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer_id)
        .single()

      if (customer) {
        customerInfo = {
          name: customer.name,
          previous_purchases: customer.total_orders,
          lead_score: customer.lead_score
        }
      }
    }

    // 4. Base knowledge авах (Admin Panel-аас)
    const { data: baseKnowledge } = await supabase
      .from('ai_base_knowledge')
      .select('content')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(10)

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

    // 5. AI Sales Agent ажиллуулах
    const aiResponse = await runSalesAgent({
      researchData: JSON.parse(researchData.ai_instructions),
      conversationHistory,
      customerMessage: message,
      customerInfo,
      baseKnowledge: baseKnowledgeText
    })

    // 6. Харилцааг хадгалах
    const newMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: aiResponse }
    ]

    if (conversation_id) {
      // Байгаа харилцааг шинэчлэх
      await supabase
        .from('conversations')
        .update({
          messages: newMessages,
          last_message_at: new Date().toISOString(),
          message_count: newMessages.length
        })
        .eq('id', conversation_id)
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversation_id
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
