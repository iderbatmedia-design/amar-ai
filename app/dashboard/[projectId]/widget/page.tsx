'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

export default function WidgetPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<{ name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  // Widget тохиргоо
  const [config, setConfig] = useState({
    position: 'bottom-right',
    color: '#3B82F6',
    greeting: 'Сайн байна у|у! Танд хэрхэн туслах вэ?'
  })

  useEffect(() => {
    loadProject()
  }, [projectId])

  const loadProject = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      setProject(data)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEmbedCode = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
    return `<script
  src="${baseUrl}/widget.js"
  data-project-id="${projectId}"
  data-position="${config.position}"
  data-color="${config.color}"
  data-greeting="${config.greeting}"
></script>`
  }

  const copyCode = () => {
    navigator.clipboard.writeText(getEmbedCode())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <div className="flex items-center h-16">
            <button onClick={() => router.push(`/dashboard/${projectId}`)} className="text-gray-500 hover:text-gray-700">
              ← Буцах
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-4">🌐 Website Widget</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Intro */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <h2 className="text-lg font-semibold mb-2">Та өөрийн вебсайтад AI чат нэмэх боломжтой!</h2>
          <p className="opacity-90">
            Доорх кодыг вебсайтынхаа HTML-д хуулж оруулаад AI борлуулалтын туслахаа
            шууд ашиглаарай.
          </p>
        </Card>

        {/* Config */}
        <Card>
          <h3 className="font-semibold mb-4">Тохиргоо</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Байрлал</label>
              <select
                value={config.position}
                onChange={(e) => setConfig({...config, position: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bottom-right">Баруун доод</option>
                <option value="bottom-left">Зүүн доод</option>
                <option value="top-right">Баруун дээд</option>
                <option value="top-left">Зүүн дээд</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Өнгө</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => setConfig({...config, color: e.target.value})}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.color}
                  onChange={(e) => setConfig({...config, color: e.target.value})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Мэндчилгээ</label>
              <input
                type="text"
                value={config.greeting}
                onChange={(e) => setConfig({...config, greeting: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Embed Code */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Embed код</h3>
            <Button onClick={copyCode} variant={copied ? 'outline' : 'primary'} size="sm">
              {copied ? '✅ Хуулагдсан!' : '📋 Хуулах'}
            </Button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm whitespace-pre-wrap">
              {getEmbedCode()}
            </pre>
          </div>
        </Card>

        {/* Instructions */}
        <Card>
          <h3 className="font-semibold mb-4">Хэрхэн суулгах вэ?</h3>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Кодыг хуулах</strong>
                <p className="text-gray-600">Дээрх "Хуулах" товчийг дарж embed кодыг хуулна уу</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>HTML-д оруулах</strong>
                <p className="text-gray-600">Вебсайтынхаа HTML файлын <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> таг-ийн өмнө кодыг оруулна уу</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Шалгах</strong>
                <p className="text-gray-600">Вебсайтаа нээж, баруун доод буланд чат товч харагдаж байгаа эсэхийг шалгана уу</p>
              </div>
            </li>
          </ol>
        </Card>

        {/* Preview */}
        <Card>
          <h3 className="font-semibold mb-4">Урьдчилан харах</h3>
          <div className="relative bg-gray-100 rounded-lg h-96 overflow-hidden">
            {/* Fake browser */}
            <div className="bg-gray-200 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500">
                yourwebsite.com
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h4 className="font-bold text-lg mb-2">{project?.name || 'Таны вебсайт'}</h4>
                <p className="text-gray-500 text-sm">Энэ бол таны вебсайтын контент...</p>
              </div>
            </div>

            {/* Widget Preview */}
            <div
              className="absolute"
              style={{
                [config.position.includes('right') ? 'right' : 'left']: '20px',
                [config.position.includes('bottom') ? 'bottom' : 'top']: '20px'
              }}
            >
              <div
                className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: config.color }}
              >
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                  <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
                </svg>
              </div>
            </div>
          </div>
        </Card>

        {/* Platforms */}
        <Card className="bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">📌 Дэмжигдэх платформууд</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• WordPress, Wix, Squarespace</li>
            <li>• Shopify, WooCommerce</li>
            <li>• Custom HTML вебсайтууд</li>
            <li>• React, Vue, Angular аппликейшнүүд</li>
          </ul>
        </Card>
      </main>
    </div>
  )
}
