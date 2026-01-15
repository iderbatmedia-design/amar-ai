import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { runSalesAgent } from '@/app/lib/openai'

// Webhook verify token (та өөрийн нууц үг оруулна)
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'amarai_webhook_2024'

// GET - Webhook баталгаажуулалт (Meta шалгахад ашиглана)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified!')
    return new Response(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST - Мессеж хүлээн авах
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Messenger эсвэл Instagram мессеж
    if (body.object === 'page' || body.object === 'instagram') {
      for (const entry of body.entry || []) {
        // Messaging events
        for (const event of entry.messaging || []) {
          await handleMessagingEvent(event, body.object)
        }

        // Comment events (feed)
        for (const change of entry.changes || []) {
          if (change.field === 'feed') {
            await handleFeedEvent(change.value, entry.id)
          }
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Мессеж боловсруулах
async function handleMessagingEvent(event: any, platform: string) {
  const supabase = createServerClient()

  const senderId = event.sender?.id
  const recipientId = event.recipient?.id // Page ID
  const message = event.message?.text

  if (!senderId || !message) return

  console.log(`New ${platform} message from ${senderId}: ${message}`)

  try {
    // 1. Social account олох (Page ID-аар)
    const { data: socialAccount } = await supabase
      .from('social_accounts')
      .select('*, projects(*)')
      .eq('platform_user_id', recipientId)
      .single()

    if (!socialAccount) {
      console.log('Social account not found for:', recipientId)
      return
    }

    const projectId = socialAccount.project_id

    // 2. Customer олох эсвэл үүсгэх
    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('project_id', projectId)
      .eq('platform_user_id', senderId)
      .single()

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          project_id: projectId,
          platform: platform === 'page' ? 'facebook' : 'instagram',
          platform_user_id: senderId,
          lead_score: 'cold'
        })
        .select()
        .single()

      customer = newCustomer
    }

    // 3. Conversation олох эсвэл үүсгэх
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('project_id', projectId)
      .eq('customer_id', customer?.id)
      .eq('status', 'active')
      .single()

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          customer_id: customer?.id,
          platform: platform === 'page' ? 'facebook' : 'instagram',
          status: 'active',
          messages: []
        })
        .select()
        .single()

      conversation = newConv
    }

    // 4. Research data авах
    const { data: researchData } = await supabase
      .from('research_data')
      .select('ai_instructions')
      .eq('project_id', projectId)
      .single()

    if (!researchData?.ai_instructions) {
      console.log('No AI training for project:', projectId)
      return
    }

    // 5. Products авах (зургуудын хамт)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, images')
      .eq('project_id', projectId)
      .eq('is_active', true)

    // 6. AI Sales Agent ажиллуулах
    const conversationHistory = conversation?.messages || []

    const aiResult = await runSalesAgent({
      researchData: JSON.parse(researchData.ai_instructions),
      conversationHistory,
      customerMessage: message,
      customerInfo: customer ? {
        name: customer.name,
        previous_purchases: customer.total_orders,
        lead_score: customer.lead_score
      } : undefined,
      products: products || []
    })

    // AI хариултыг задлах
    const aiResponse = typeof aiResult === 'string' ? aiResult : aiResult.message
    const imagesToSend = typeof aiResult === 'string' ? [] : (aiResult.images_to_send || [])

    // 7. Харилцааг шинэчлэх
    const newMessages = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: aiResponse }
    ]

    await supabase
      .from('conversations')
      .update({
        messages: newMessages,
        last_message_at: new Date().toISOString(),
        message_count: newMessages.length
      })
      .eq('id', conversation?.id)

    // 8. Meta руу хариулт илгээх
    await sendMetaMessage(socialAccount.access_token, senderId, aiResponse, platform)

    // 9. Зургууд илгээх (хэрэв байвал)
    for (const imageUrl of imagesToSend.slice(0, 5)) { // Max 5 зураг
      await sendMetaImage(socialAccount.access_token, senderId, imageUrl, platform)
    }

    console.log('AI responded:', aiResponse, 'Images:', imagesToSend.length)

  } catch (error) {
    console.error('Error handling message:', error)
  }
}

// Comment боловсруулах
async function handleFeedEvent(value: any, _pageId: string) {
  // Comment дээр хариулах логик
  if (value.item === 'comment' && value.verb === 'add') {
    console.log('New comment:', value.message)
    // TODO: Comment-д автоматаар хариулах
  }
}

// Meta руу мессеж илгээх
async function sendMetaMessage(accessToken: string, recipientId: string, message: string, _platform: string) {
  const url = 'https://graph.facebook.com/v18.0/me/messages'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: accessToken
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Meta API error:', error)
    }
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

// Meta руу зураг илгээх
async function sendMetaImage(accessToken: string, recipientId: string, imageUrl: string, _platform: string) {
  const url = 'https://graph.facebook.com/v18.0/me/messages'

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'image',
            payload: {
              url: imageUrl,
              is_reusable: true
            }
          }
        },
        access_token: accessToken
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Meta Image API error:', error)
    }
  } catch (error) {
    console.error('Error sending image:', error)
  }
}
