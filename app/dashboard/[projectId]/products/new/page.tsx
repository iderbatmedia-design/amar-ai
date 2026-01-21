'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'

export default function NewProductPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Зураг upload
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    features: '',
    category: '',
    sku: ''
  })

  const updateForm = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Зураг сонгох
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Max 10 зураг
    if (pendingFiles.length + files.length > 10) {
      setError('Хамгийн ихдээ 10 зураг оруулах боломжтой')
      return
    }

    const newFiles: File[] = []
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      // Файлын хэмжээ шалгах (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} файл хэт том байна (max 5MB)`)
        continue
      }

      newFiles.push(file)
      newUrls.push(URL.createObjectURL(file))
    }

    setPendingFiles(prev => [...prev, ...newFiles])
    setPreviewUrls(prev => [...prev, ...newUrls])

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Зураг устгах (preview)
  const handleRemoveFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index])
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
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

      // 1. Бүтээгдэхүүн үүсгэх
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
          features: featuresArray,
          category: formData.category || null,
          sku: formData.sku || null,
          is_active: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create product')
      }

      const productData = await response.json()
      const productId = productData.id

      // 2. Зургууд байвал upload хийх
      if (pendingFiles.length > 0 && productId) {
        setUploading(true)
        const uploadedUrls: string[] = []

        for (const file of pendingFiles) {
          const uploadFormData = new FormData()
          uploadFormData.append('file', file)
          uploadFormData.append('project_id', projectId)
          uploadFormData.append('product_id', productId)

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: uploadFormData
          })

          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            uploadedUrls.push(uploadData.url)
          }
        }

        // 3. Бүтээгдэхүүнд зургуудыг хадгалах
        if (uploadedUrls.length > 0) {
          await fetch('/api/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: productId,
              images: uploadedUrls
            })
          })
        }
      }

      router.push(`/dashboard/${projectId}/products`)
    } catch (err) {
      console.error(err)
      setError('Бүтээгдэхүүн үүсгэхэд алдаа гарлаа')
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push(`/dashboard/${projectId}/products`)}
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Үндсэн мэдээлэл */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Үндсэн мэдээлэл</h2>

            <div className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Категори"
                  placeholder="Жишээ: Хувцас"
                  value={formData.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                />

                <Input
                  label="SKU код"
                  placeholder="Жишээ: BAG-001"
                  value={formData.sku}
                  onChange={(e) => updateForm('sku', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Зургууд */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Бүтээгдэхүүний зургууд</h2>
            <p className="text-sm text-gray-500 mb-4">
              Хамгийн ихдээ 10 зураг оруулах боломжтой. AI эдгээр зургийг харилцагч руу илгээх боломжтой.
            </p>

            {/* Зургийн grid */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      title="Устгах"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upload товч */}
            {previewUrls.length < 10 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-600">Зураг сонгох ({previewUrls.length}/10)</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, WEBP - хамгийн ихдээ 5MB
                </p>
              </div>
            )}
          </Card>

          {/* Онцлогууд */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Онцлогууд</h2>

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
          </Card>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/${projectId}/products`)}
            >
              Цуцлах
            </Button>
            <Button type="submit" loading={loading || uploading}>
              {uploading ? 'Зураг оруулж байна...' : 'Бүтээгдэхүүн нэмэх'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
