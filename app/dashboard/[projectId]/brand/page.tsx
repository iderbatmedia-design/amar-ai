'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

export default function BrandProfilePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    brand_story: '',
    brand_voice: '',
    target_audience: '',
    unique_selling_points: '',
    greeting_templates: '',
    closing_templates: '',
    forbidden_words: '',
    preferred_phrases: '',
    website_url: ''
  })

  useEffect(() => {
    loadBrandProfile()
  }, [projectId])

  const loadBrandProfile = async () => {
    try {
      const { data } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (data) {
        setFormData({
          brand_story: data.brand_story || '',
          brand_voice: data.brand_voice || '',
          target_audience: data.target_audience || '',
          unique_selling_points: data.unique_selling_points?.join('\n') || '',
          greeting_templates: data.greeting_templates?.join('\n') || '',
          closing_templates: data.closing_templates?.join('\n') || '',
          forbidden_words: data.forbidden_words?.join('\n') || '',
          preferred_phrases: data.preferred_phrases?.join('\n') || '',
          website_url: data.website_url || ''
        })
      }
    } catch (error) {
      console.error('Error loading brand profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const profileData = {
        project_id: projectId,
        brand_story: formData.brand_story || null,
        brand_voice: formData.brand_voice || null,
        target_audience: formData.target_audience || null,
        unique_selling_points: formData.unique_selling_points ? formData.unique_selling_points.split('\n').filter(x => x.trim()) : null,
        greeting_templates: formData.greeting_templates ? formData.greeting_templates.split('\n').filter(x => x.trim()) : null,
        closing_templates: formData.closing_templates ? formData.closing_templates.split('\n').filter(x => x.trim()) : null,
        forbidden_words: formData.forbidden_words ? formData.forbidden_words.split('\n').filter(x => x.trim()) : null,
        preferred_phrases: formData.preferred_phrases ? formData.preferred_phrases.split('\n').filter(x => x.trim()) : null,
        website_url: formData.website_url || null
      }

      const { error } = await supabase
        .from('brand_profiles')
        .upsert(profileData, { onConflict: 'project_id' })

      if (error) throw error

      // AI дахин сургах
      await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      })

      alert('Хадгалагдлаа! AI шинэчлэгдлээ.')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Алдаа гарлаа')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900 ml-4">🎨 Брэнд профайл</h1>
            </div>
            <Button onClick={handleSave} loading={saving}>
              Хадгалах
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <h3 className="font-semibold mb-4">🔗 Вэбсайт линк</h3>
          <p className="text-sm text-gray-500 mb-2">AI энэ линкийг харилцагчдад хуваалцана</p>
          <input
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://couplelab.mn"
            value={formData.website_url}
            onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Брэндийн түүх</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Бизнесийн үүсэл, түүх, онцлогийг бичнэ үү. AI энэ мэдээллийг харилцагчидтай хуваалцана."
            value={formData.brand_story}
            onChange={(e) => setFormData(prev => ({ ...prev, brand_story: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Яриа өрнүүлэх хэв маяг</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Жишээ: Найрсаг, хөгжилтэй, залуу хүмүүст зориулсан. Emoji ашиглана. Хэт албан ёсны биш."
            value={formData.brand_voice}
            onChange={(e) => setFormData(prev => ({ ...prev, brand_voice: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Зорилтот хэрэглэгч</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Жишээ: 25-40 насны эмэгтэйчүүд, гоо сайхны бүтээгдэхүүнд сонирхолтой"
            value={formData.target_audience}
            onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Давуу талууд (мөр бүрт нэг)</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Үнэгүй хүргэлт&#10;100% баталгаат&#10;7 хоногийн буцаалт"
            value={formData.unique_selling_points}
            onChange={(e) => setFormData(prev => ({ ...prev, unique_selling_points: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Мэндчилгээний загварууд (мөр бүрт нэг)</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Сайн байна уу! Тавтай морил 😊&#10;Юугаар туслах вэ?&#10;Манайхаар зочилсонд баярлалаа!"
            value={formData.greeting_templates}
            onChange={(e) => setFormData(prev => ({ ...prev, greeting_templates: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Хэрэглэхгүй байх үгс (мөр бүрт нэг)</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Эрхэм&#10;Хүндэт"
            value={formData.forbidden_words}
            onChange={(e) => setFormData(prev => ({ ...prev, forbidden_words: e.target.value }))}
          />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">Илүүд үзэх хэллэгүүд (мөр бүрт нэг)</h3>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Тийм ээ&#10;За за&#10;Мэдээж"
            value={formData.preferred_phrases}
            onChange={(e) => setFormData(prev => ({ ...prev, preferred_phrases: e.target.value }))}
          />
        </Card>
      </main>
    </div>
  )
}
