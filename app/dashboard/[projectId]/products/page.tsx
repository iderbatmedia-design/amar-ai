'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface Product {
  id: string
  name: string
  description: string | null
  price: number | null
  stock: number
  features: string[] | null
  is_active: boolean
  created_at: string
}

export default function ProductsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [projectId])

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (deleteConfirm !== productId) {
      setDeleteConfirm(productId)
      return
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      setProducts(prev => prev.filter(p => p.id !== productId))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Бүтээгдэхүүн устгахад алдаа гарлаа')
    }
  }

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ))
    } catch (error) {
      console.error('Error toggling product:', error)
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/dashboard/${projectId}`)}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900 ml-4">
                Бүтээгдэхүүнүүд
              </h1>
            </div>
            <Button onClick={() => router.push(`/dashboard/${projectId}/products/new`)}>
              + Шинэ бүтээгдэхүүн
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Бүтээгдэхүүн байхгүй
            </h3>
            <p className="text-gray-500 mb-6">
              Эхний бүтээгдэхүүнээ нэмээрэй
            </p>
            <Button onClick={() => router.push(`/dashboard/${projectId}/products/new`)}>
              Бүтээгдэхүүн нэмэх
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {product.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {product.price && (
                        <span className="font-medium text-gray-900">
                          {product.price.toLocaleString()}₮
                        </span>
                      )}
                      <span>Нөөц: {product.stock} ш</span>
                      {product.features && product.features.length > 0 && (
                        <span>{product.features.length} онцлог</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.is_active
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={product.is_active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </button>

                    <button
                      onClick={() => router.push(`/dashboard/${projectId}/products/${product.id}`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Засварлах"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {deleteConfirm === product.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Устгах
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Болих
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Устгах"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
