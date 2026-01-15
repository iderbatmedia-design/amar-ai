'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Input, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | null
  stock: number
  features: string[] | null
  is_active: boolean
  category: string | null
  sku: string | null
  images: string[] | null
}

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const productId = params.productId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Зураг upload
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    features: '',
    category: '',
    sku: '',
    is_active: true
  })

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          name: data.name || '',
          description: data.description || '',
          price: data.price?.toString() || '',
          stock: data.stock?.toString() || '0',
          features: data.features?.join('\n') || '',
          category: data.category || '',
          sku: data.sku || '',
          is_active: data.is_active ?? true
        })
        setImages(data.images || [])
      }
    } catch (error) {
      console.error('Error loading product:', error)
      setError('Бүтээгдэхүүн олдсонгүй')
    } finally {
      setLoading(false)
    }
  }

  const updateForm = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  // Зураг upload хийх
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Max 10 зураг
    if (images.length + files.length > 10) {
      setError('Хамгийн ихдээ 10 зураг оруулах боломжтой')
      return
    }

    setUploading(true)
    setError('')

    try {
      const newUrls: string[] = []

      for (const file of Array.from(files)) {
        // Файлын хэмжээ шалгах (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          setError(`${file.name} файл хэт том байна (max 5MB)`)
          continue
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('project_id', projectId)
        formData.append('product_id', productId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const data = await response.json()
        newUrls.push(data.url)
      }

      // Шинэ зургуудыг нэмэх
      const updatedImages = [...images, ...newUrls]
      setImages(updatedImages)

      // Database-д хадгалах
      await supabase
        .from('products')
        .update({ images: updatedImages })
        .eq('id', productId)

    } catch (err) {
      console.error('Upload error:', err)
      setError('Зураг оруулахад алдаа гарлаа')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Зураг устгах
  const handleDeleteImage = async (urlToDelete: string) => {
    try {
      const updatedImages = images.filter(url => url !== urlToDelete)
      setImages(updatedImages)

      // Database-д хадгалах
      await supabase
        .from('products')
        .update({ images: updatedImages })
        .eq('id', productId)

      // Storage-с устгах (optional - path extract хийх хэрэгтэй)
      const path = urlToDelete.split('/product-images/')[1]
      if (path) {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        })
      }
    } catch (err) {
      console.error('Delete error:', err)
      setError('Зураг устгахад алдаа гарлаа')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name) {
      setError('Бүтээгдэхүүний нэр оруулна уу')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const featuresArray = formData.features
        ? formData.features.split('\n').filter(f => f.trim())
        : null

      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description || null,
          price: formData.price ? parseFloat(formData.price) : null,
          stock: formData.stock ? parseInt(formData.stock) : 0,
          features: featuresArray,
          category: formData.category || null,
          sku: formData.sku || null,
          is_active: formData.is_active
        })
        .eq('id', productId)

      if (error) throw error

      setSuccess(true)
    } catch (err) {
      console.error(err)
      setError('Бүтээгдэхүүн хадгалахад алдаа гарлаа')
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/dashboard/${projectId}/products`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900 ml-4">
                Бүтээгдэхүүн засварлах
              </h1>
            </div>
            <span className={`px-3 py-1 text-sm rounded-full ${
              formData.is_active
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {formData.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
            </span>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  rows={4}
                  placeholder="Бүтээгдэхүүний дэлгэрэнгүй тайлбар..."
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Ангилал"
                  placeholder="Жишээ: Цүнх, Гутал"
                  value={formData.category}
                  onChange={(e) => updateForm('category', e.target.value)}
                />

                <Input
                  label="SKU / Барааны код"
                  placeholder="Жишээ: BAG-001"
                  value={formData.sku}
                  onChange={(e) => updateForm('sku', e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Үнэ, нөөц */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Үнэ, нөөц</h2>

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
          </Card>

          {/* Зургууд */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Бүтээгдэхүүний зургууд</h2>
            <p className="text-sm text-gray-500 mb-4">
              Хамгийн ихдээ 10 зураг оруулах боломжтой. AI эдгээр зургийг харилцагч руу илгээх боломжтой.
            </p>

            {/* Зургийн grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                {images.map((url, index) => (
                  <div key={index} className="relative group aspect-square">
                    <img
                      src={url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(url)}
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
            {images.length < 10 && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className={`flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    uploading
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-gray-500">Зураг оруулж байна...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-600">Зураг сонгох ({images.length}/10)</span>
                    </>
                  )}
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
                rows={5}
                placeholder="Жинхэнэ арьс&#10;Гар урлал&#10;1 жил баталгаа&#10;Үнэгүй хүргэлт"
                value={formData.features}
                onChange={(e) => updateForm('features', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Мөр бүрт нэг онцлог бичнэ үү. AI энэ онцлогуудыг харилцагчид тайлбарлахдаа ашиглана.
              </p>
            </div>
          </Card>

          {/* Төлөв */}
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Төлөв</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => updateForm('is_active', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <span className="font-medium text-gray-900">Идэвхтэй</span>
                <p className="text-sm text-gray-500">
                  Идэвхгүй бол AI энэ бүтээгдэхүүнийг санал болгохгүй
                </p>
              </div>
            </label>
          </Card>

          {/* Алдаа / Амжилт */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              ✅ Бүтээгдэхүүн амжилттай хадгалагдлаа!
            </div>
          )}

          {/* Товчлуурууд */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/dashboard/${projectId}/products`)}
            >
              Буцах
            </Button>

            <Button type="submit" loading={saving}>
              Хадгалах
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
