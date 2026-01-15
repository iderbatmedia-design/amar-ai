'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'

export default function NewProductPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    features: ''
  })

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      setError('Бүтээгдэхүүний нэр оруулна уу')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Features-г массив болгох
      const featuresArray = formData.features
        ? formData.features.split('\n').filter(f => f.trim())
        : null

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          name: formData.name,
          description: formData.description || null,
          price: formData.price ? parseFloat(formData.price) : null,
          stock: formData.stock ? parseInt(formData.stock) : 0,
          features: featuresArray
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create product')
      }

      router.push(`/dashboard/${projectId}`)
    } catch (err) {
      console.error(err)
      setError('Бүтээгдэхүүн үүсгэхэд алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push(`/dashboard/${projectId}`)}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">
              Шинэ бүтээгдэхүүн
            </h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Бүтээгдэхүүний нэр *"
              placeholder="Жишээ: Арьсан цүнх"
              value={formData.name}
              onChange={(e) => updateForm('name', e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тайлбар
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Бүтээгдэхүүний дэлгэрэнгүй тайлбар..."
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Үнэ (₮)"
                type="number"
                placeholder="150000"
                value={formData.price}
                onChange={(e) => updateForm('price', e.target.value)}
              />

              <Input
                label="Нөөц (ширхэг)"
                type="number"
                placeholder="100"
                value={formData.stock}
                onChange={(e) => updateForm('stock', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Онцлогууд (мөр бүрт нэгийг бич)
              </label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Жинхэнэ арьс&#10;Гар урлал&#10;1 жил баталгаа&#10;Үнэгүй хүргэлт"
                value={formData.features}
                onChange={(e) => updateForm('features', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Мөр бүрт нэг онцлог бичнэ үү
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${projectId}`)}
              >
                Цуцлах
              </Button>
              <Button type="submit" loading={loading}>
                Бүтээгдэхүүн нэмэх
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
