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
}) {
  const systemPrompt = `Та Монгол бизнесүүдэд зориулсан AI борлуулалтын туслах бэлтгэх судлаач юм.

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
}) {
  const { researchData, conversationHistory, customerMessage, customerInfo, baseKnowledge } = params

  const systemPrompt = `Та "${researchData.business_summary}" бизнесийн AI борлуулалтын туслах юм.

## Таны дүр:
- Нэр: AI Туслах
- Байр суурь: Найрсаг, туслахад бэлэн борлуулагч
- Хэв маяг: ${researchData.tone_guidelines || 'Хүндэтгэлтэй, найрсаг, мэргэжлийн'}

## Бизнесийн мэдлэг:
${JSON.stringify(researchData, null, 2)}

${baseKnowledge ? `## Нэмэлт мэдлэг:\n${baseKnowledge}` : ''}

## Харилцагчийн мэдээлэл:
${customerInfo ? `
- Нэр: ${customerInfo.name || 'Тодорхойгүй'}
- Өмнөх худалдан авалт: ${customerInfo.previous_purchases || 0}
- Төлөв: ${customerInfo.lead_score || 'Шинэ'}
` : 'Шинэ харилцагч'}

## Чухал дүрмүүд:
1. Монгол хэлээр ярь, хэрэв англиар бичвэл монголоор хариул
2. Богино, тодорхой хариулт өг (2-3 өгүүлбэр)
3. Асуулт асууж, хэрэгцээг ойлго
4. Бүтээгдэхүүн санал болгохдоо ашиг тусыг онцол
5. Үнийн талаар асуувал шууд хариул, нуухгүй
6. Захиалга хийхэд бэлэн бол утас, хаяг асуу
7. Хүн рүү шилжүүлэх хүсвэл "Мэргэжилтэнтэй холбоно, түр хүлээнэ үү" гэ
8. Emoji хэрэглэж болно, гэхдээ хэт олон биш

## Хариу өгөх формат:
Зөвхөн хариултын текст, тайлбар бичих хэрэггүй.`

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
      max_tokens: 500
    })

    return response.choices[0].message.content || 'Уучлаарай, түр алдаа гарлаа.'
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
