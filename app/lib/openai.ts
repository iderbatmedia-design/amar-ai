import OpenAI from 'openai'

// OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// AI Research Engine - Бизнесийн судалгаа хийх
export async function runResearchEngine(projectData: {
  name: string
  industry: string
  description: string
  products: Array<{
    name: string
    description: string
    price: number
    features: string[]
  }>
  brandProfile?: {
    brand_story?: string
    brand_values?: string[]
    target_audience?: string
    unique_selling_points?: string[]
  }
  baseKnowledge?: string  // Admin-ий сургасан research мэдлэг
}) {
  // Admin-ий сургасан мэдлэгийг задлах
  const knowledgeLines = projectData.baseKnowledge?.split('\n\n').filter(line => line.trim()) || []

  const systemPrompt = `Та дэлхийн шилдэг борлуулалтын мэргэжилтэн, бизнес хөгжүүлэгч, ментор юм.

## 🎯 ТАНЫ ХЭНИЙГ ТӨЛӨӨЛЖ БАЙГАА:
- Grant Cardone (Борлуулалтын хаан) - агрессив, үр дүнд чиглэсэн
- Alex Hormozi ($100M Offers) - үнэ цэнэ, оффер бүтээх
- Russell Brunson (ClickFunnels) - сэтгэл зүй, фаннел
- Жорж Сөрөс шиг стратегич сэтгэлгээ

## 🔬 ТАНЫ ҮҮРЭГ:
Бизнес эзэмшигчийн өгсөн мэдээллийг ГҮНЗГИЙ ШИНЖИЛЖ, AI борлуулалтын туслахад зориулсан МЭРГЭЖЛИЙН ТҮВШНИЙ судалгаа бэлдэх.

${projectData.baseKnowledge ? `
═══════════════════════════════════════════════════════════════════
📚 ПЛАТФОРМ ЭЗНИЙ СУДАЛГААНЫ ЗААВАР (Дагах ёстой!):
═══════════════════════════════════════════════════════════════════
${knowledgeLines.map((line, i) => `${i + 1}. ${line}`).join('\n')}
═══════════════════════════════════════════════════════════════════
` : ''}

## 📊 СУДАЛГААНЫ АРГА ЗҮЙ:

### 1. БИЗНЕСИЙН ГҮНЗГИЙ ШИНЖИЛГЭЭ
- Бизнесийн цөм үнэ цэнэ (Core Value Proposition)
- Өрсөлдөөний давуу тал (Competitive Advantage)
- Зах зээлийн байр суурь (Market Positioning)

### 2. ХЭРЭГЛЭГЧИЙН СЭТГЭЛ ЗҮЙ
- Худалдан авах БОДИТ шалтгаан (яагаад хэрэгтэй вэ?)
- Өвдөлтийн цэгүүд (Pain Points)
- Хүсэл тэмүүлэл (Desires & Dreams)
- Худалдан авахаас татгалзах шалтгаан

### 3. БОРЛУУЛАЛТЫН СТРАТЕГИ
- Үнэ цэнийн шатлал (Value Ladder)
- Эсэргүүцэл даван туулах скриптүүд
- CTA (Call to Action) хэрхэн хэлэх
- Urgency үүсгэх аргууд

### 4. ЯРИА ӨРНҮҮЛЭХ АРГА БАРИЛ
- Мэндчилгээ → Сонирхол татах → Танилцуулга → Эсэргүүцэл шийдэх → Хаалт хийх
- Асуулт асуух техник (SPIN Selling)
- Сонсох, ойлгох, шийдэл санал болгох

Хариултаа JSON форматаар, ДЭЛГЭРЭНГҮЙ, ПРАКТИК өгнө үү.`

  const userPrompt = `Дараах бизнесийн мэдээллийг судалж, AI борлуулалтын туслахад зориулсан дэлгэрэнгүй заавар бэлдэнэ үү:

**Бизнесийн нэр:** ${projectData.name}
**Салбар:** ${projectData.industry}
**Тайлбар:** ${projectData.description}

**Бүтээгдэхүүнүүд:**
${projectData.products.map((p, i) => `
${i + 1}. ${p.name}
   - Тайлбар: ${p.description || 'Байхгүй'}
   - Үнэ: ${p.price ? p.price.toLocaleString() + '₮' : 'Тодорхойгүй'}
   - Онцлогууд: ${p.features?.join(', ') || 'Байхгүй'}
`).join('')}

${projectData.brandProfile ? `
**Брэндийн мэдээлэл:**
- Брэндийн түүх: ${projectData.brandProfile.brand_story || 'Байхгүй'}
- Үнэт зүйлс: ${projectData.brandProfile.brand_values?.join(', ') || 'Байхгүй'}
- Зорилтот хэрэглэгч: ${projectData.brandProfile.target_audience || 'Байхгүй'}
- Онцлог давуу тал: ${projectData.brandProfile.unique_selling_points?.join(', ') || 'Байхгүй'}
` : ''}

Дараах JSON форматаар хариулна уу. БҮХ талбарыг ЗААВАЛ, ДЭЛГЭРЭНГҮЙ бөглөх!

{
  "business_summary": "Бизнесийн товч танилцуулга (2-3 өгүүлбэр, үнэ цэнийг тодорхой хэлэх)",
  "core_value_proposition": "Яагаад энэ бизнес өрсөлдөгчдөөсөө ялгаатай вэ? (1 өгүүлбэр)",
  "sales_channel": "website | delivery | both",
  "is_digital_product": true | false,
  "website_url": "Бизнесийн вэбсайт линк (байвал). Жишээ: https://couplelab.mn",
  "purchase_instructions": "Захиалга хийх ДЭЛГЭРЭНГҮЙ заавар (алхам алхмаар)",

  "market_analysis": "Зах зээлийн ГҮНЗГИЙ шинжилгээ (5-7 өгүүлбэр): Өрсөлдөөн, зах зээлийн хэмжээ, чиг хандлага, боломж, аюул занал.",

  "target_audience": "Зорилтот хэрэглэгчдийн ДЭЛГЭРЭНГҮЙ профайл (нас, хүйс, орлого, амьдралын хэв маяг, сонирхол, асуудал).",

  "customer_psychology": {
    "pain_points": ["Өвдөлтийн цэг 1 - яагаад хэрэгтэй вэ", "Өвдөлтийн цэг 2", "Өвдөлтийн цэг 3"],
    "desires": ["Хүсэл тэмүүлэл 1 - юу болохыг хүсч байна", "Хүсэл 2", "Хүсэл 3"],
    "fears": ["Айдас 1 - юунаас айж байна", "Айдас 2"],
    "buying_triggers": ["Худалдан авах триггер 1", "Триггер 2", "Триггер 3"]
  },

  "customer_behavior": "Хэрэглэгчийн зан төлөв, худалдан авах шийдвэрт нөлөөлөх хүчин зүйлс (5+ өгүүлбэр).",

  "brand_voice": "Брэндийн ярилцах хэв маяг, өнгө аяс - ЯГ ХЭРХЭН ярих талаар дэлгэрэнгүй заавар.",

  "key_selling_points": [
    "Гол давуу тал 1 - яагаад чухал вэ гэдгийг тайлбарлах",
    "Гол давуу тал 2 - яагаад чухал вэ",
    "Гол давуу тал 3 - яагаад чухал вэ",
    "Гол давуу тал 4",
    "Гол давуу тал 5"
  ],

  "usp_per_product": [
    {
      "product": "Бүтээгдэхүүний нэр",
      "usp": "Онцгой давуу тал - яагаад энийг авах ЁСТОЙ вэ (2-3 өгүүлбэр)",
      "elevator_pitch": "30 секундын танилцуулга",
      "transformation": "Худалдан авсны дараа хэрэглэгч ямар болох вэ"
    }
  ],

  "product_knowledge": [
    {
      "product_name": "Бүтээгдэхүүний нэр",
      "product_type": "digital | physical",
      "short_pitch": "Богино танилцуулга (1 өгүүлбэр)",
      "detailed_description": "Дэлгэрэнгүй тайлбар (3-5 өгүүлбэр)",
      "benefits": ["Ашиг тус 1 - хэрхэн амьдралыг өөрчлөх вэ", "Ашиг тус 2", "Ашиг тус 3"],
      "features": ["Онцлог 1", "Онцлог 2", "Онцлог 3"],
      "ideal_for": "Хэнд тохирох - дэлгэрэнгүй",
      "not_for": "Хэнд тохирохгүй",
      "how_to_buy": "Яаж авах заавар - алхам алхмаар"
    }
  ],

  "sales_scripts": {
    "opening": "Яриа эхлүүлэх скрипт (яг юу хэлэх)",
    "qualifying": "Хэрэгцээ тодорхойлох асуултууд",
    "presenting": "Бүтээгдэхүүн танилцуулах скрипт",
    "closing": "Хаалт хийх скрипт - яаж захиалга авах",
    "follow_up": "Дараа нь дахин холбогдох скрипт"
  },

  "common_questions": [
    {"question": "Түгээмэл асуулт 1", "answer": "Дэлгэрэнгүй, итгэл төрүүлэх хариулт"},
    {"question": "Түгээмэл асуулт 2", "answer": "Хариулт"},
    {"question": "Түгээмэл асуулт 3", "answer": "Хариулт"},
    {"question": "Түгээмэл асуулт 4", "answer": "Хариулт"},
    {"question": "Түгээмэл асуулт 5", "answer": "Хариулт"}
  ],

  "objection_handling": [
    {"objection": "Үнэ өндөр байна", "response": "Дэлгэрэнгүй, итгүүлэх хариу аргумент (3+ өгүүлбэр)"},
    {"objection": "Бодох хэрэгтэй", "response": "Хариу + urgency"},
    {"objection": "Өөр газраас авъя", "response": "Яагаад биднээс авах ёстой вэ"},
    {"objection": "Итгэлгүй байна", "response": "Итгэл төрүүлэх хариу"},
    {"objection": "Хэрэггүй", "response": "Хэрэгцээг ойлгуулах хариу"},
    {"objection": "Дараа авъя", "response": "Яагаад одоо авах ёстой вэ"}
  ],

  "urgency_tactics": [
    "Urgency үүсгэх арга 1 (хязгаарлагдмал тоо, хугацаа гэх мэт)",
    "Urgency арга 2",
    "Urgency арга 3"
  ],

  "social_proof": "Нийгмийн нотолгоо - яаж итгэл төрүүлэх вэ",

  "sales_tips": [
    "Борлуулалтын мэргэжлийн зөвлөгөө 1",
    "Зөвлөгөө 2",
    "Зөвлөгөө 3",
    "Зөвлөгөө 4",
    "Зөвлөгөө 5"
  ],

  "greeting_style": "Мэндчилгээний ЯГ хэв маяг - жишээтэй",
  "tone_guidelines": "Яриа өрнүүлэх дэлгэрэнгүй зааварчилгаа",
  "do_not_say": ["Хэлж болохгүй зүйл 1", "Хэлж болохгүй зүйл 2", "Хэлж болохгүй зүйл 3"]
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 8000,  // Урт контентыг бүрэн хадгалахын тулд
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Empty response from AI')

    return JSON.parse(content)
  } catch (error) {
    console.error('Research Engine error:', error)
    throw error
  }
}

// AI Sales Agent - Худалдааны туслах
export async function runSalesAgent(params: {
  researchData: any
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>
  customerMessage: string
  customerInfo?: {
    name?: string
    previous_purchases?: number
    lead_score?: string
  }
  baseKnowledge?: string
  products?: Array<{
    id: string
    name: string
    description: string | null
    price: number | null
    features: string[] | null
    stock: number
    images: string[] | null
  }>
}) {
  const { researchData, conversationHistory, customerMessage, baseKnowledge, products } = params

  // Өмнө нь мэндчилсэн эсэхийг шалгах
  const alreadyGreeted = conversationHistory.length > 0

  // Base knowledge-г задлан категори болгох
  const knowledgeLines = baseKnowledge?.split('\n\n').filter(line => line.trim()) || []

  // Харилцаанд зураг илгээсэн эсэхийг шалгах
  const alreadySentImages = conversationHistory.some(msg =>
    msg.role === 'assistant' && msg.content.includes('[ЗУРАГ ИЛГЭЭСЭН]')
  )

  // Зурагтай бүтээгдэхүүнүүд
  const productsWithImages = products?.filter(p => p.images && p.images.length > 0) || []

  // Optimized shorter prompt for faster response (2-5 seconds target)
  const systemPrompt = `Та "${researchData.business_summary}" бизнесийн борлуулалтын AI.

${baseKnowledge ? `## ЗААВАР:\n${knowledgeLines.slice(0, 3).join('\n')}\n` : ''}
## ДҮРЭМ:
${alreadyGreeted ? '- ДАХИН МЭНДЧИЛЭХГҮЙ! Шууд хариул.' : '- Шинэ харилцаа. Мэндчил.'}
${researchData.website_url ? `- Захиалга: ${researchData.website_url}` : ''}
${researchData.is_digital_product ? '- Дижитал бүтээгдэхүүн (хаяг асуухгүй!)' : ''}

## БҮТЭЭГДЭХҮҮН:
${products?.slice(0, 5).map(p => `
【${p.name}】 Үнэ: ${p.price?.toLocaleString()}₮
ID: ${p.id} ${p.images?.length ? '[ЗУРАГТАЙ]' : ''}
`).join('\n') || 'Бүтээгдэхүүн байхгүй'}

## ХАРИУЛАХ ДҮРЭМ:
- Мэндчилгээ: Богино, найрсаг
- Бүтээгдэхүүний талаар асуувал: DESCRIPTION-ийг ашиглан товч танилцуул
- "дэлгэрэнгүй", "онцлог", "юу сурах", "агуулга" гэвэл: FEATURES бүрэн хуулж илгээ

## ЗУРАГ:
${alreadySentImages
    ? '❌ АЛЬ ХЭДИЙН ЗУРАГ ИЛГЭЭСЭН! send_images_for_products=[] байх ёстой!'
    : productsWithImages.length > 0
      ? `✅ Зураг илгээж болно! Харилцагч "зураг", "үзүүлээч" гэвэл send_images_for_products-д ID оруул.\nЗурагтай: ${productsWithImages.map(p => p.id).join(', ')}`
      : '❌ Зурагтай бүтээгдэхүүн байхгүй'
}

JSON: {"message":"хариулт","send_images_for_products":["product_id"] эсвэл []}`

  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    { role: 'user', content: customerMessage }
  ]

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Хурдан, хямд model
      messages,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      return {
        message: 'Уучлаарай, түр алдаа гарлаа.',
        send_images_for_products: [],
        images_to_send: [],
        create_order: null
      }
    }

    try {
      const parsed = JSON.parse(content)
      console.log('AI parsed response:', JSON.stringify(parsed).substring(0, 200))

      // Зургийн URL-уудыг олох
      const imagesToSend: string[] = []
      if (parsed.send_images_for_products && parsed.send_images_for_products.length > 0 && products) {
        for (const productId of parsed.send_images_for_products.slice(0, 3)) { // Max 3 бүтээгдэхүүн
          const product = products.find(p => p.id === productId)
          if (product?.images) {
            imagesToSend.push(...product.images)
          }
        }
      }

      // ЧУХАЛ: message талбар байгаа эсэхийг шалгах
      let messageText = parsed.message || parsed.response || parsed.text || parsed.reply
      if (!messageText) {
        console.error('AI response missing message field:', content.substring(0, 300))
        return {
          message: 'Уучлаарай, түр алдаа гарлаа. Дахин оролдоно уу.',
          send_images_for_products: [],
          images_to_send: [],
          create_order: null
        }
      }

      // Хэрэв харилцагч "дэлгэрэнгүй", "онцлог", "агуулга" гэж асуувал features нэмэх
      const detailKeywords = ['дэлгэрэнгүй', 'онцлог', 'агуулга', 'юу сурах', 'юу байгаа', 'ямар зүйл']
      const askedForDetails = detailKeywords.some(kw => customerMessage.toLowerCase().includes(kw))

      if (askedForDetails && products && products.length > 0) {
        const product = products[0] // Эхний бүтээгдэхүүн
        if (product.features && product.features.length > 0) {
          messageText += '\n\n📚 Агуулга:\n' + product.features.join('\n')
        }
      }

      return {
        message: messageText,
        send_images_for_products: parsed.send_images_for_products || [],
        images_to_send: imagesToSend,
        create_order: parsed.create_order || null
      }
    } catch (e) {
      // JSON parse алдаа бол шууд текст буцаах
      console.error('JSON parse error:', e, 'Content:', content.substring(0, 200))
      return {
        message: content.includes('"message"') ? 'Уучлаарай, түр алдаа гарлаа.' : content,
        send_images_for_products: [],
        images_to_send: [],
        create_order: null
      }
    }
  } catch (error) {
    console.error('Sales Agent error:', error)
    throw error
  }
}

// AI Classifier - Харилцааг ангилах
export async function runClassifier(conversation: Array<{ role: string, content: string }>) {
  const systemPrompt = `Та харилцааны дүн шинжилгээ хийх AI юм.

Харилцааг шинжилж дараах JSON форматаар хариулна уу:
{
  "lead_score": "hot" | "warm" | "cold",
  "intent": "purchase" | "inquiry" | "complaint" | "support" | "other",
  "sentiment": "positive" | "neutral" | "negative",
  "should_follow_up": true | false,
  "follow_up_reason": "string or null",
  "summary": "Харилцааны товч дүгнэлт",
  "next_action": "Дараагийн хийх үйлдэл"
}`

  const conversationText = conversation.map(m => `${m.role}: ${m.content}`).join('\n')

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Дараах харилцааг шинжилнэ үү:\n\n${conversationText}` }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('Empty response')

    return JSON.parse(content)
  } catch (error) {
    console.error('Classifier error:', error)
    throw error
  }
}

// AI Coach - Бизнес эзэнд зөвлөгөө өгөх
export async function runAICoach(params: {
  projectData: any
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }>
  userMessage: string
  analyticsData?: any
}) {
  const { projectData, conversationHistory, userMessage, analyticsData } = params

  const systemPrompt = `Та бизнес эзэдэд зориулсан AI зөвлөх юм.

## Таны үүрэг:
- Бизнесийн гүйцэтгэлийн талаар зөвлөгөө өгөх
- AI борлуулалтын туслахыг сайжруулах санал өгөх
- Борлуулалтын стратегийн зөвлөгөө өгөх
- Асуултанд хариулах

## Бизнесийн мэдээлэл:
${JSON.stringify(projectData, null, 2)}

${analyticsData ? `## Статистик:\n${JSON.stringify(analyticsData, null, 2)}` : ''}

## Дүрмүүд:
1. Монгол хэлээр ярь
2. Практик, хэрэгжүүлэхэд хялбар зөвлөгөө өг
3. Тоо баримтад суурилсан шинжилгээ хий
4. Урам зориг өг, шүүмжлэхгүй`

  const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ]

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    })

    return response.choices[0].message.content || 'Уучлаарай, түр алдаа гарлаа.'
  } catch (error) {
    console.error('AI Coach error:', error)
    throw error
  }
}
