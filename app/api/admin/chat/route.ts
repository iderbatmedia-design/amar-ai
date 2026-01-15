import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { openai } from '@/app/lib/openai'

// POST - Admin AI-тай чатлах, мэдлэг нэмэх
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { message, history } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const systemPrompt = `Та AmarAI платформын AI сургагч юм. Платформын эзэн тантай ярилцаж байна.

Таны үүрэг:
1. Платформын эзнээс AI-н талаар зааварчилгаа, мэдлэг хүлээн авах
2. Авсан мэдлэгийг цэгцтэй бүтэцтэйгээр хадгалах
3. Асуултанд хариулж, тодруулга хийх

Хэрэв платформын эзэн AI-д заах мэдлэг өгвөл:
- Тэр мэдлэгийг тодорхой болгож асуу
- "Энэ мэдлэгийг хадгалах уу?" гэж асуу
- Хэрэглэгч "тийм", "хадгал", "за" гэж хариулвал JSON буцаа:
  {"save": true, "category": "ангилал", "title": "гарчиг", "content": "агуулга"}

Жишээ ярилцлага:
User: "Харилцагч үнэ өндөр гэвэл яаж хариулах вэ?"
Assistant: "Сайн асуулт! Үнэ өндөр гэсэн эсэргүүцлийг хэрхэн шийдвэрлэх талаар дэлгэрэнгүй зааварчилгаа өгнө үү. Жишээлбэл ямар хариулт өгөх вэ?"
User: "Чанар, баталгаа, урт хугацааны үнэ цэнийг онцлох"
Assistant: "Маш сайн! Энэ мэдлэгийг хадгалах уу?
- Ангилал: objections
- Гарчиг: Үнэ өндөр гэсэн эсэргүүцэл
- Агуулга: Үнэ өндөр гэвэл чанар, баталгаа, урт хугацааны үнэ цэнийг онцлох"
User: "За хадгал"
Assistant: {"save": true, "category": "objections", "title": "Үнэ өндөр гэсэн эсэргүүцэл", "content": "Үнэ өндөр гэвэл чанар, баталгаа, урт хугацааны үнэ цэнийг онцлох"}

Монгол хэлээр ярь. Найрсаг, тусламжтай байж, мэдлэгийг цэгцтэй авч хадгал.`

    const messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      { role: 'user', content: message }
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000
    })

    let aiResponse = response.choices[0].message.content || ''
    let knowledgeAdded = false

    // JSON хариулт байвал мэдлэг хадгалах
    try {
      if (aiResponse.includes('"save": true') || aiResponse.includes('"save":true')) {
        const jsonMatch = aiResponse.match(/\{[\s\S]*"save"[\s\S]*\}/)
        if (jsonMatch) {
          const saveData = JSON.parse(jsonMatch[0])
          if (saveData.save && saveData.content) {
            await supabase.from('ai_base_knowledge').insert({
              category: saveData.category || 'general',
              title: saveData.title || 'Шинэ мэдлэг',
              content: saveData.content,
              is_active: true
            })
            knowledgeAdded = true
            aiResponse = `✅ Мэдлэг амжилттай хадгалагдлаа!\n\n📚 **${saveData.title}**\n${saveData.content}\n\nӨөр юу заах вэ?`
          }
        }
      }
    } catch (e) {
      // JSON parse алдаа - хэвийн хариулт буцаана
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      knowledge_added: knowledgeAdded
    })

  } catch (error) {
    console.error('Admin chat error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
