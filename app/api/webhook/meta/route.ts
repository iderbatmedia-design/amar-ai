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
      .eq('page_id', recipientId)
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
      // Meta API-аас хэрэглэгчийн мэдээлэл авах
      let customerName = null
      let customerProfilePic = null

      try {
        const profileResponse = await fetch(
          `https://graph.facebook.com/v18.0/${senderId}?fields=name,profile_pic&access_token=${socialAccount.access_token}`
        )
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          customerName = profileData.name || null
          customerProfilePic = profileData.profile_pic || null
          console.log('Got customer profile:', customerName)
        }
      } catch (e) {
        console.log('Could not fetch customer profile:', e)
      }

      // Insert customer (profile_picture column may not exist, so we try without it first)
      const customerData: Record<string, any> = {
        project_id: projectId,
        platform: platform === 'page' ? 'facebook' : 'instagram',
        platform_user_id: senderId,
        name: customerName,
        lead_score: 'cold',
        first_contact_at: new Date().toISOString()
      }

      // Only add profile_picture if we got one (column may not exist in DB)
      if (customerProfilePic) {
        customerData.profile_picture = customerProfilePic
      }

      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single()

      if (customerError) {
        console.error('Error creating customer:', customerError)
        // Retry without profile_picture if that's the issue
        if (customerError.message?.includes('profile_picture')) {
          delete customerData.profile_picture
          const { data: retryCustomer } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single()
          customer = retryCustomer
        }
      } else {
        customer = newCustomer
      }
      console.log('Created new customer:', customer?.id, customerName)
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
          ai_enabled: true,
          messages: []
        })
        .select()
        .single()

      conversation = newConv
    }

    // AI зогссон бол мессежийг хадгалаад хариулахгүй
    if (conversation?.ai_enabled === false) {
      console.log('AI disabled for this conversation, skipping auto-reply')
      const newMessages = [
        ...(conversation.messages || []),
        { role: 'user', content: message, created_at: new Date().toISOString() }
      ]
      await supabase
        .from('conversations')
        .update({
          messages: newMessages,
          message_count: newMessages.length,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id)

      // Customer-ийн last_interaction_at шинэчлэх
      await supabase
        .from('customers')
        .update({ last_interaction_at: new Date().toISOString() })
        .eq('id', customer?.id)

      return
    }

    // 4-5. Research data, Products, Base knowledge-г ЗЭРЭГ авах (хурдны оптимизаци)
    const [researchResult, productsResult, baseKnowledgeResult] = await Promise.all([
      supabase
        .from('research_data')
        .select('ai_instructions')
        .eq('project_id', projectId)
        .single(),
      supabase
        .from('products')
        .select('id, name, description, price, features, stock, images')
        .eq('project_id', projectId)
        .eq('is_active', true),
      supabase
        .from('ai_base_knowledge')
        .select('content')
        .eq('is_active', true)
        .in('category', ['sales', 'general'])
        .order('priority', { ascending: false })
        .limit(10)
    ])

    const researchData = researchResult.data
    const products = productsResult.data
    const baseKnowledge = baseKnowledgeResult.data

    if (!researchData?.ai_instructions) {
      console.log('No AI training for project:', projectId)
      const defaultResponse = 'Сайн байна уу! Манай хуудастай холбогдсонд баярлалаа. Удахгүй тантай холбогдох болно. 🙏'
      await sendMetaMessage(socialAccount.access_token, senderId, defaultResponse, platform)
      return
    }

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

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
      baseKnowledge: baseKnowledgeText,
      products: products || []
    })

    // AI хариултыг задлах
    const aiResponse = typeof aiResult === 'string' ? aiResult : aiResult.message
    const imagesToSend = typeof aiResult === 'string' ? [] : (aiResult.images_to_send || [])

    // 7. Харилцааг шинэчлэх (зураг илгээсэн бол тэмдэглэх)
    const responseWithImageMarker = imagesToSend.length > 0
      ? `${aiResponse} [ЗУРАГ ИЛГЭЭСЭН]`
      : aiResponse

    const newMessages = [
      ...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: responseWithImageMarker }
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
async function handleFeedEvent(value: any, pageId: string) {
  const supabase = createServerClient()

  // Зөвхөн шинэ comment-д хариулах
  if (value.item !== 'comment' || value.verb !== 'add') return

  // Өөрийн comment-д хариулахгүй (Page-ийн comment)
  if (value.from?.id === pageId) return

  const commentId = value.comment_id
  const commentMessage = value.message
  const senderId = value.from?.id
  const senderName = value.from?.name

  if (!commentId || !commentMessage || !senderId) return

  console.log(`New Facebook comment from ${senderName}: ${commentMessage}`)

  try {
    // 1. Social account олох (Page ID-аар)
    const { data: socialAccount } = await supabase
      .from('social_accounts')
      .select('*, projects(*)')
      .eq('page_id', pageId)
      .eq('platform', 'facebook')
      .single()

    if (!socialAccount || !socialAccount.is_active) {
      console.log('Social account not found or inactive for page:', pageId)
      return
    }

    const projectId = socialAccount.project_id

    // 2. Research data авах
    const { data: researchData } = await supabase
      .from('research_data')
      .select('ai_instructions')
      .eq('project_id', projectId)
      .single()

    if (!researchData?.ai_instructions) {
      console.log('No AI training for project:', projectId)
      return
    }

    // 3. Products авах
    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, price, features, stock, images')
      .eq('project_id', projectId)
      .eq('is_active', true)

    // 4. Base knowledge авах
    const { data: baseKnowledge } = await supabase
      .from('ai_base_knowledge')
      .select('content')
      .eq('is_active', true)
      .in('category', ['sales', 'general'])
      .limit(5)

    const baseKnowledgeText = baseKnowledge?.map(k => k.content).join('\n\n') || ''

    // 5. AI Sales Agent ажиллуулах (comment-д богино хариулт)
    const aiResult = await runSalesAgent({
      researchData: JSON.parse(researchData.ai_instructions),
      conversationHistory: [], // Comment нь шинэ харилцаа
      customerMessage: commentMessage,
      customerInfo: { name: senderName },
      baseKnowledge: baseKnowledgeText,
      products: products || []
    })

    const aiResponse = typeof aiResult === 'string' ? aiResult : aiResult.message

    // 6. Comment-д хариулт илгээх
    await replyToComment(socialAccount.access_token, commentId, aiResponse)

    // 7. Хэрэв сонирхож байвал Messenger руу урих
    if (aiResponse.length > 100) {
      // Урт хариулт бол Messenger руу урих сануулга нэмэх
      const messengerPrompt = '\n\n💬 Дэлгэрэнгүй мэдээлэл авахыг хүсвэл Messenger-ээр бичээрэй!'
      await replyToComment(socialAccount.access_token, commentId, messengerPrompt)
    }

    // 8. Customer үүсгэх (хэрэв байхгүй бол)
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('project_id', projectId)
      .eq('platform_user_id', senderId)
      .single()

    if (!existingCustomer) {
      await supabase
        .from('customers')
        .insert({
          project_id: projectId,
          platform: 'facebook',
          platform_user_id: senderId,
          name: senderName,
          lead_score: 'warm' // Comment бичсэн бол warm
        })
    }

    console.log('AI replied to comment:', aiResponse.substring(0, 50) + '...')

  } catch (error) {
    console.error('Error handling comment:', error)
  }
}

// Facebook comment-д хариулах
async function replyToComment(accessToken: string, commentId: string, message: string) {
  const url = `https://graph.facebook.com/v18.0/${commentId}/comments`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        access_token: accessToken
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Comment reply error:', error)
    }
  } catch (error) {
    console.error('Error replying to comment:', error)
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
