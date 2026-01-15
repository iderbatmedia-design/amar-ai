'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'
import { getCurrentUser } from '@/app/lib/supabase'

// Бизнесийн төрөл
const businessTypes = [
  {
    value: 'online_retail',
    label: 'Online борлуулалт',
    icon: '🛒',
    description: 'Facebook, Instagram-ээр бүтээгдэхүүн зарна'
  },
  {
    value: 'physical_retail',
    label: 'Лангууны борлуулалт',
    icon: '🏪',
    description: 'Дэлгүүр, лангуутай бизнес'
  },
  {
    value: 'service',
    label: 'Үйлчилгээ',
    icon: '💼',
    description: 'Гоо сайхан, засвар, зөвлөгөө гэх мэт'
  },
  {
    value: 'digital',
    label: 'Digital үйлчилгээ',
    icon: '💻',
    description: 'Веб, апп, дизайн, маркетинг'
  },
]

// Бизнесийн төрлөөс хамаарсан категориуд
const categoriesByType: Record<string, { value: string; label: string }[]> = {
  online_retail: [
    { value: 'fashion', label: 'Хувцас, гутал' },
    { value: 'cosmetics', label: 'Гоо сайхан, арьс арчилгаа' },
    { value: 'electronics', label: 'Электроник, гар утас' },
    { value: 'home', label: 'Гэр ахуй, тавилга' },
    { value: 'food', label: 'Хүнс, амттан' },
    { value: 'kids', label: 'Хүүхдийн бараа' },
    { value: 'sports', label: 'Спорт, фитнесс' },
    { value: 'other', label: 'Бусад (өөрөө бичих)' },
  ],
  physical_retail: [
    { value: 'grocery', label: 'Хүнсний дэлгүүр' },
    { value: 'clothing_store', label: 'Хувцасны дэлгүүр' },
    { value: 'pharmacy', label: 'Эмийн сан' },
    { value: 'hardware', label: 'Барилгын материал' },
    { value: 'restaurant', label: 'Ресторан, кафе' },
    { value: 'flower_shop', label: 'Цэцгийн дэлгүүр' },
    { value: 'other', label: 'Бусад (өөрөө бичих)' },
  ],
  service: [
    { value: 'beauty_salon', label: 'Гоо сайхны салон' },
    { value: 'cleaning', label: 'Цэвэрлэгээ' },
    { value: 'repair', label: 'Засвар үйлчилгээ' },
    { value: 'education', label: 'Сургалт, хичээл' },
    { value: 'health', label: 'Эрүүл мэнд, массаж' },
    { value: 'event', label: 'Арга хэмжээ зохион байгуулалт' },
    { value: 'consulting', label: 'Зөвлөх үйлчилгээ' },
    { value: 'other', label: 'Бусад (өөрөө бичих)' },
  ],
  digital: [
    { value: 'web_dev', label: 'Веб хөгжүүлэлт' },
    { value: 'app_dev', label: 'Апп хөгжүүлэлт' },
    { value: 'design', label: 'График дизайн' },
    { value: 'marketing', label: 'Digital маркетинг' },
    { value: 'smm', label: 'SMM, контент' },
    { value: 'video', label: 'Видео продакшн' },
    { value: 'other', label: 'Бусад (өөрөө бичих)' },
  ],
}

const aiTones = [
  { value: 'friendly', label: 'Найрсаг', description: 'Дотно, халуун дулаан харилцаа' },
  { value: 'professional', label: 'Мэргэжлийн', description: 'Албан ёсны, итгэл төрүүлсэн' },
  { value: 'casual', label: 'Энгийн', description: 'Хөнгөн, залуучуудад зориулсан' },
]

export default function WizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    business_type: '',
    industry: '',
    custom_industry: '',
    name: '',
    description: '',
    ai_name: 'AI Туслах',
    ai_tone: 'friendly',
  })

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Бизнес төрөл солигдоход category reset хийх
    if (field === 'business_type') {
      setFormData(prev => ({ ...prev, [field]: value, industry: '', custom_industry: '' }))
    }
  }

  const handleNext = () => {
    if (step === 1 && !formData.business_type) {
      setError('Бизнесийн төрөл сонгоно уу')
      return
    }
    if (step === 2 && !formData.industry) {
      setError('Категори сонгоно уу')
      return
    }
    if (step === 2 && formData.industry === 'other' && !formData.custom_industry) {
      setError('Категори бичнэ үү')
      return
    }
    if (step === 3 && !formData.name) {
      setError('Бизнесийн нэр оруулна уу')
      return
    }
    setError('')
    setStep(step + 1)
  }

  const handleBack = () => {
    setError('')
    setStep(step - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const { user } = await getCurrentUser()
      if (!user) {
        router.push('/')
        return
      }

      const finalIndustry = formData.industry === 'other'
        ? formData.custom_industry
        : formData.industry

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          name: formData.name,
          industry: `${formData.business_type}:${finalIndustry}`,
          description: formData.description,
          ai_name: formData.ai_name,
          ai_tone: formData.ai_tone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create project')
      }

      const project = await response.json()
      router.push(`/dashboard/${project.id}`)
    } catch (err) {
      console.error(err)
      setError('Төсөл үүсгэхэд алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  const currentCategories = categoriesByType[formData.business_type] || []
  const selectedType = businessTypes.find(t => t.value === formData.business_type)
  const selectedCategory = currentCategories.find(c => c.value === formData.industry)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Шинэ Төсөл Үүсгэх</h1>
          <p className="text-gray-600 mt-2">Таны бизнесийн мэдээллийг оруулна уу</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                  s <= step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 5 && (
                <div
                  className={`w-8 h-1 ${
                    s < step ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          {/* Step 1: Бизнесийн төрөл */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Бизнесийн төрөл</h2>
              <p className="text-gray-600">Та ямар төрлийн бизнес эрхэлдэг вэ?</p>

              <div className="grid grid-cols-1 gap-3">
                {businessTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateForm('business_type', type.value)}
                    className={`p-4 text-left rounded-xl border-2 transition-all ${
                      formData.business_type === type.value
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{type.icon}</span>
                      <div>
                        <div className="font-semibold text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-500">{type.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Категори */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Категори сонгох</h2>
              <p className="text-gray-600">
                <span className="font-medium">{selectedType?.label}</span> - ямар чиглэлийн бизнес вэ?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {currentCategories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => updateForm('industry', cat.value)}
                    className={`p-3 text-left rounded-lg border-2 transition-colors ${
                      formData.industry === cat.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {formData.industry === 'other' && (
                <Input
                  label="Категори бичих"
                  placeholder="Жишээ: Гэрийн тэжээвэр амьтан"
                  value={formData.custom_industry}
                  onChange={(e) => updateForm('custom_industry', e.target.value)}
                />
              )}
            </div>
          )}

          {/* Step 3: Бизнесийн мэдээлэл */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Бизнесийн мэдээлэл</h2>

              <Input
                label="Бизнесийн нэр *"
                placeholder="Жишээ: Монгол Гоёл"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Бизнесийн тухай (AI-д туслах мэдээлэл)
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Юу зардаг, ямар онцлогтой, хэнд зориулсан гэх мэт..."
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Энэ мэдээлэл AI-д таны бизнесийг илүү сайн ойлгоход тусална
                </p>
              </div>
            </div>
          )}

          {/* Step 4: AI тохиргоо */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">AI Туслахын тохиргоо</h2>

              <Input
                label="AI-н нэр"
                placeholder="Жишээ: Сарнай, Болд"
                value={formData.ai_name}
                onChange={(e) => updateForm('ai_name', e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ярианы хэв маяг
                </label>
                <div className="space-y-2">
                  {aiTones.map((tone) => (
                    <button
                      key={tone.value}
                      type="button"
                      onClick={() => updateForm('ai_tone', tone.value)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                        formData.ai_tone === tone.value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{tone.label}</div>
                      <div className="text-sm text-gray-500">{tone.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Баталгаажуулалт */}
          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Баталгаажуулалт</h2>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Бизнесийн төрөл:</span>
                  <span className="font-medium">{selectedType?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Категори:</span>
                  <span className="font-medium">
                    {formData.industry === 'other'
                      ? formData.custom_industry
                      : selectedCategory?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Бизнесийн нэр:</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AI нэр:</span>
                  <span className="font-medium">{formData.ai_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ярианы хэв маяг:</span>
                  <span className="font-medium">
                    {aiTones.find(t => t.value === formData.ai_tone)?.label}
                  </span>
                </div>
                {formData.description && (
                  <div>
                    <span className="text-gray-600">Тайлбар:</span>
                    <p className="mt-1 text-sm bg-white p-2 rounded">{formData.description}</p>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 text-center">
                Төсөл үүсгэсний дараа бүтээгдэхүүн нэмэх боломжтой
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                Буцах
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Цуцлах
              </Button>
            )}

            {step < 5 ? (
              <Button onClick={handleNext}>Үргэлжлүүлэх</Button>
            ) : (
              <Button onClick={handleSubmit} loading={loading}>
                Төсөл үүсгэх
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
