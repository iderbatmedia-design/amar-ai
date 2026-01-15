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

  const systemPrompt = `Та Монгол бизнесүүдэд зориулсан AI борлуулалтын туслах бэлтгэх судлаач юм.

${projectData.baseKnowledge ? `
#####################################################################
## 🚨🚨🚨 ПЛАТФОРМ ЭЗНИЙ ЗААВАР - ХАМГИЙН ДЭЭД ЭРЭМБЭ! 🚨🚨🚨
#####################################################################

${knowledgeLines.map((line, i) => `### ${i + 1}. ${line}`).join('\n\n')}

#####################################################################
⛔ ЭНЭ ЗААВРУУДЫГ СУДАЛГААНД 100% ТУСГАХ!
⛔ Бизнес эзний мэдээллээс ИЛҮҮ ЧУХАЛ!
⛔ Заавар зөрчвөл судалгаа БҮТЭЛГҮЙТНЭ!
#####################################################################
` : ''}

Таны үүрэг:
1. Бизнесийн мэдээллийг задлан шинжлэх
2. Бүтээгдэхүүний онцлог, давуу талыг тодорхойлох
3. Зорилтот хэрэглэгчдийг тодорхойлох
4. Түгээмэл асуултууд болон хариултуудыг бэлдэх
5. Борлуулалтын стратеги боловсруулах
6. Эсэргүүцлийг шийдвэрлэх аргуудыг бэлдэх

Хариултаа JSON форматаар өгнө үү.`

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

Дараах JSON форматаар хариулна уу:
{
  "business_summary": "Бизнесийн товч танилцуулга",
  "target_customers": ["Зорилтот хэрэглэгч 1", "Зорилтот хэрэглэгч 2"],
  "key_selling_points": ["Гол давуу тал 1", "Гол давуу тал 2"],
  "product_knowledge": [
    {
      "product_name": "Бүтээгдэхүүний нэр",
      "short_pitch": "Богино танилцуулга",
      "benefits": ["Ашиг тус 1", "Ашиг тус 2"],
      "ideal_for": "Хэнд тохирох"
    }
  ],
  "common_questions": [
    {
      "question": "Түгээмэл асуулт",
      "answer": "Хариулт"
    }
  ],
  "objection_handling": [
    {
      "objection": "Эсэргүүцэл",
      "response": "Хариу"
    }
  ],
  "sales_tips": ["Борлуулалтын зөвлөгөө 1", "Зөвлөгөө 2"],
  "greeting_style": "Мэндчилгээний хэв маяг",
  "tone_guidelines": "Яриа өрнүүлэх зааварчилгаа"
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
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
    images: string[] | null
  }>
}) {
  const { researchData, conversationHistory, customerMessage, customerInfo, baseKnowledge, products } = params

  // Өмнө нь мэндчилсэн эсэхийг шалгах
  const alreadyGreeted = conversationHistory.length > 0

  // Base knowledge-г задлан категори болгох
  const knowledgeLines = baseKnowledge?.split('\n\n').filter(line => line.trim()) || []

  // Бүтээгдэхүүний зургийн мэдээлэл
  const productsWithImages = products?.filter(p => p.images && p.images.length > 0) || []
  const productImageInfo = productsWithImages.length > 0
    ? productsWithImages.map(p => `- "${p.name}": ${p.images!.length} зурагтай (ID: ${p.id})`).join('\n')
    : 'Зурагтай бүтээгдэхүүн байхгүй'

  const systemPrompt = `Та "${researchData.business_summary}" бизнесийн AI борлуулалтын туслах юм.

${baseKnowledge ? `
#####################################################################
## 🚨🚨🚨 ПЛАТФОРМ ЭЗНИЙ ЗААВАР - ХАМГИЙН ДЭЭД ЭРЭМБЭ! 🚨🚨🚨
#####################################################################

${knowledgeLines.map((line, i) => `### ${i + 1}. ${line}`).join('\n\n')}

#####################################################################
⛔ ЭНЭ ЗААВРУУДЫГ ЗӨРЧВӨЛ БҮТЭЛГҮЙТНЭ!
⛔ CTA заавар байвал ЯГ ТЭР ҮГЭЭР хэл (өөрчлөхгүй!)
⛔ Жишээ: "утасны дугаар, гэрийн хаягаа өгөөрэй" → ЯГ ИНГЭЖ хэл!
⛔ Бизнес эзний мэдээллээс ИЛҮҮ ЧУХАЛ!
#####################################################################
` : ''}

## ХАМГИЙН ЧУХАЛ ДҮРЭМ:
${alreadyGreeted ? `
⚠️ АНХААР: Энэ харилцаа ҮРГЭЛЖИЛЖ байна! Та аль хэдийн мэндчилсэн!
- ДАХИН МЭНДЧИЛЭХГҮЙ! "Сайн байна уу", "Баярлалаа холбогдсонд" гэх мэт БҮҮ хэл!
- Шууд асуултад хариул эсвэл яриагаа үргэлжлүүл
` : `
- Энэ бол ШИНЭ харилцаа, мэндчилж болно
`}

## Таны дүр:
- Найрсаг, туслахад бэлэн борлуулагч (РОБОТ БИШ, ХҮНИЙ ШИГ)
- Хэв маяг: ${researchData.tone_guidelines || 'Хүндэтгэлтэй, найрсаг'}

## Бизнесийн мэдлэг:
${JSON.stringify(researchData, null, 2)}

## Харилцагчийн мэдээлэл:
${customerInfo ? `
- Нэр: ${customerInfo.name || 'Тодорхойгүй'}
- Өмнөх худалдан авалт: ${customerInfo.previous_purchases || 0}
` : 'Шинэ харилцагч'}

## Хариулах дүрэм:
1. Монгол хэлээр ярь
2. Товч, тодорхой хариулт (1-3 өгүүлбэр)
3. "Эрхэм үйлчлүүлэгч" гэж БҮҮ хэл
4. ${alreadyGreeted ? 'ДАХИН МЭНДЧИЛЭХГҮЙ!' : 'Мэндчилж болно'}
5. Шууд хариулт өг, урт тайлбар хэрэггүй
6. CTA (захиалга авах үед): Платформ эзний заасан яг тэр үг хэллэгийг хэрэглэ!

## Бүтээгдэхүүний зургууд:
${productImageInfo}

## ЗУРАГ ИЛГЭЭХ ДҮРЭМ:
- Харилцагч бүтээгдэхүүний зураг үзэхийг хүсвэл, эсвэл бүтээгдэхүүний талаар сонирхож байвал зураг илгээ
- Зураг илгээхдээ тухайн бүтээгдэхүүний ID-г заана уу
- Хэрэв олон бүтээгдэхүүний зураг хүсвэл, хамгийн их 3 бүтээгдэхүүний зураг илгээ

## ХАРИУЛТЫН ФОРМАТ (JSON):
Заавал дараах JSON форматаар хариулна уу:
{
  "message": "Таны хариулт энд",
  "send_images_for_products": ["product_id_1", "product_id_2"] // Зураг илгээх бүтээгдэхүүний ID-ууд, байхгүй бол хоосон массив []
}`

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
      model: 'gpt-4o',
      messages,
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    if (!content) {
      return {
        message: 'Уучлаарай, түр алдаа гарлаа.',
        send_images_for_products: []
      }
    }

    try {
      const parsed = JSON.parse(content)

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

      return {
        message: parsed.message || content,
        send_images_for_products: parsed.send_images_for_products || [],
        images_to_send: imagesToSend
      }
    } catch {
      // JSON parse алдаа бол шууд текст буцаах
      return {
        message: content,
        send_images_for_products: [],
        images_to_send: []
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
