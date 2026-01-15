'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { getCurrentUser, supabase } from '@/app/lib/supabase'
import type { Project, Product, Customer } from '@/types'

type TabType = 'overview' | 'products' | 'customers' | 'settings'

export default function ProjectDashboard() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { user } = await getCurrentUser()
      if (!user) {
        router.push('/')
        return
      }

      // Project авах
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (projectError || !projectData) {
        router.push('/dashboard')
        return
      }

      setProject(projectData)

      // Products авах
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('project_id', projectId)

      setProducts(productsData || [])

      // Customers авах
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('project_id', projectId)

      setCustomers(customersData || [])
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  const tabs = [
    { id: 'overview', label: 'Тойм' },
    { id: 'products', label: 'Бүтээгдэхүүн' },
    { id: 'customers', label: 'Харилцагч' },
    { id: 'settings', label: 'Тохиргоо' },
  ]

  const hotLeads = customers.filter(c => c.classification === 'hot').length
  const warmLeads = customers.filter(c => c.classification === 'warm').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Буцах
              </button>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <span className={`px-2 py-1 text-xs rounded-full ${
                project.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {project.status === 'active' ? 'Идэвхтэй' : 'Зогссон'}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              AI: {project.ai_name}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <div className="text-sm text-gray-500">Нийт бүтээгдэхүүн</div>
                <div className="text-2xl font-bold mt-1">{products.length}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Нийт харилцагч</div>
                <div className="text-2xl font-bold mt-1">{customers.length}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Hot Leads</div>
                <div className="text-2xl font-bold mt-1 text-red-600">{hotLeads}</div>
              </Card>
              <Card>
                <div className="text-sm text-gray-500">Warm Leads</div>
                <div className="text-2xl font-bold mt-1 text-orange-600">{warmLeads}</div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h3 className="font-semibold mb-4">Түргэн үйлдлүүд</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => router.push(`/dashboard/${projectId}/test-chat`)} className="justify-center">
                  💬 AI туршилт
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/inbox`)} variant="outline" className="justify-center">
                  📥 Inbox
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/orders`)} variant="outline" className="justify-center">
                  📦 Захиалгууд
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/analytics`)} variant="outline" className="justify-center">
                  📊 Статистик
                </Button>
              </div>
            </Card>

            {/* AI Settings */}
            <Card>
              <h3 className="font-semibold mb-4">AI тохиргоо</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => router.push(`/dashboard/${projectId}/research`)} variant="outline" className="justify-center">
                  🔬 AI Судалгаа
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/brand`)} variant="outline" className="justify-center">
                  🎨 Брэнд профайл
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/coach`)} variant="outline" className="justify-center">
                  🤖 AI Зөвлөх
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/connect`)} variant="outline" className="justify-center">
                  🔗 FB/IG холбох
                </Button>
              </div>
            </Card>

            {/* Бүтээгдэхүүний удирдлага */}
            <Card>
              <h3 className="font-semibold mb-4">Бүтээгдэхүүн</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button onClick={() => router.push(`/dashboard/${projectId}/products`)} variant="outline" className="justify-center">
                  📦 Бүх бүтээгдэхүүн
                </Button>
                <Button onClick={() => router.push(`/dashboard/${projectId}/products/new`)} variant="outline" className="justify-center">
                  + Шинэ нэмэх
                </Button>
              </div>
            </Card>

            {/* AI Info */}
            <Card>
              <h3 className="font-semibold mb-4">AI Туслах</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Нэр:</span>
                  <span className="ml-2 font-medium">{project.ai_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Хэв маяг:</span>
                  <span className="ml-2 font-medium">
                    {project.ai_tone === 'friendly' && 'Найрсаг'}
                    {project.ai_tone === 'professional' && 'Мэргэжлийн'}
                    {project.ai_tone === 'casual' && 'Энгийн'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Бүтээгдэхүүнүүд</h2>
              <Button onClick={() => router.push(`/dashboard/${projectId}/products/new`)}>
                + Бүтээгдэхүүн нэмэх
              </Button>
            </div>

            {products.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Бүтээгдэхүүн байхгүй</h3>
                <p className="text-gray-500 mb-6">AI борлуулалт хийхийн тулд бүтээгдэхүүн нэмээрэй</p>
                <Button onClick={() => router.push(`/dashboard/${projectId}/products/new`)}>
                  Бүтээгдэхүүн нэмэх
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/dashboard/${projectId}/products/${product.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{product.name}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.is_active ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      {product.price ? (
                        <span className="font-bold text-blue-600">
                          {product.price.toLocaleString()}₮
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Үнэ оруулаагүй</span>
                      )}
                      <span className="text-xs text-gray-400">
                        Засварлах →
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Харилцагчид</h2>

            {customers.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Харилцагч байхгүй</h3>
                <p className="text-gray-500">FB/IG холбосны дараа харилцагчид энд харагдана</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <Card key={customer.id} padding="sm" className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{customer.name || 'Нэргүй'}</span>
                      <span className="text-sm text-gray-500 ml-2">{customer.platform}</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      customer.classification === 'hot' ? 'bg-red-100 text-red-700' :
                      customer.classification === 'warm' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {customer.classification}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Тохиргоо</h2>

            <Card>
              <h3 className="font-medium mb-4">Төслийн мэдээлэл</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Нэр:</span>
                  <span>{project.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Салбар:</span>
                  <span>{project.industry || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Үүсгэсэн:</span>
                  <span>{new Date(project.created_at).toLocaleDateString('mn-MN')}</span>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="font-medium mb-4 text-red-600">Аюултай бүс</h3>
              <Button variant="danger" size="sm">
                Төсөл устгах
              </Button>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
