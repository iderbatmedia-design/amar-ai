import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runSalesAgent } from '@/app/lib/openai'

// POST - AI Sales Agent-тай чатлах
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { project_id, conversation_id, message, customer_id, history } = await request.json()

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

    // 2. Харилцааны түүх авах - history параметрээс эсвэл DB-ээс
    let conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []

    // Хэрэв history дамжуулсан бол түүнийг ашиглах (test-chat-аас)
    if (history && Array.isArray(history)) {
      conversationHistory = history
    } else if (conversation_id) {
      // DB-ээс авах (бодит харилцаанд)
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

    // 4. Base knowledge авах (Admin Panel-аас) - зөвхөн sales категори
    const { data: baseKnowledge } = await supabase
      .from('ai_base_knowledge')
      .select('content, category')
      .eq('is_active', true)
      .in('category', ['sales', 'general'])  // sales болон general категори
      .order('priority', { ascending: false })
      .limit(10)

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

    // 5. Бүтээгдэхүүнүүд болон зургуудыг авах (үнэ, тайлбар гэх мэт бүх мэдээлэл)
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
      customerInfo,
      baseKnowledge: baseKnowledgeText,
      products: products || []
    })

    // 7. AI хариуг задлах
    const responseMessage = typeof aiResponse === 'string' ? aiResponse : aiResponse.message
    const imagesToSend = typeof aiResponse === 'string' ? [] : (aiResponse.images_to_send || [])

    // 8. Захиалга үүсгэх (AI хүсвэл)
    let createdOrder = null
    if (typeof aiResponse !== 'string' && aiResponse.create_order) {
      const orderData = aiResponse.create_order
      try {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            project_id,
            customer_id: customer_id || null,
            conversation_id: conversation_id || null,
            items: orderData.items || [],
            total_amount: orderData.total_amount || 0,
            customer_phone: orderData.customer_phone || null,
            customer_address: orderData.customer_address || null,
            customer_name: orderData.customer_name || null,
            status: 'pending'
          })
          .select()
          .single()

        if (!orderError && order) {
          createdOrder = order

          // Харилцагчийн статистик шинэчлэх (байвал)
          if (customer_id) {
            const { data: customer } = await supabase
              .from('customers')
              .select('total_orders')
              .eq('id', customer_id)
              .single()

            if (customer) {
              await supabase
                .from('customers')
                .update({
                  total_orders: (customer.total_orders || 0) + 1,
                  lead_score: 'hot'
                })
                .eq('id', customer_id)
            }
          }
        }
      } catch (orderErr) {
        console.error('Order creation error:', orderErr)
      }
    }

    // 9. Харилцааг хадгалах
    const newMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: message },
      { role: 'assistant' as const, content: responseMessage }
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
      response: responseMessage,
      images: imagesToSend,
      conversation_id,
      order: createdOrder
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
