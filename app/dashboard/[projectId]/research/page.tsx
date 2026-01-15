'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Card } from '@/components/ui'
import { supabase } from '@/app/lib/supabase'

interface ResearchData {
  id: string
  project_id: string
  ai_instructions: string
  last_research_at: string
}

interface AIInstructions {
  market_analysis?: string
  customer_behavior?: string
  usp_per_product?: Array<{ product: string; usp: string }>
  objection_handling?: Array<{ objection: string; response: string }>
  key_selling_points?: string[]
  target_audience?: string
  brand_voice?: string
  [key: string]: any
}

export default function ResearchPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [researchData, setResearchData] = useState<ResearchData | null>(null)
  const [instructions, setInstructions] = useState<AIInstructions>({})
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadResearchData()
  }, [projectId])

  const loadResearchData = async () => {
    try {
      const { data } = await supabase
        .from('research_data')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (data) {
        setResearchData(data)
        if (data.ai_instructions) {
          try {
            setInstructions(JSON.parse(data.ai_instructions))
          } catch (e) {
            setInstructions({})
          }
        }
      }
    } catch (error) {
      console.error('Error loading research:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveResearch = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('research_data')
        .update({
          ai_instructions: JSON.stringify(instructions),
          last_research_at: new Date().toISOString()
        })
        .eq('project_id', projectId)

      if (!error) {
        setEditMode(false)
        loadResearchData()
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setSaving(false)
    }
  }

  const regenerateResearch = async () => {
    if (!confirm('AI дахин судалгаа хийх үү? Одоогийн засварууд устах болно.')) return

    setRegenerating(true)
    try {
      const response = await fetch('/api/ai/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId })
      })

      if (response.ok) {
        loadResearchData()
      }
    } catch (error) {
      console.error('Error regenerating:', error)
    } finally {
      setRegenerating(false)
    }
  }

  const updateField = (field: string, value: any) => {
    setInstructions(prev => ({ ...prev, [field]: value }))
  }

  const addUSP = () => {
    setInstructions(prev => ({
      ...prev,
      usp_per_product: [...(prev.usp_per_product || []), { product: '', usp: '' }]
    }))
  }

  const updateUSP = (index: number, field: 'product' | 'usp', value: string) => {
    setInstructions(prev => {
      const usps = [...(prev.usp_per_product || [])]
      usps[index] = { ...usps[index], [field]: value }
      return { ...prev, usp_per_product: usps }
    })
  }

  const removeUSP = (index: number) => {
    setInstructions(prev => ({
      ...prev,
      usp_per_product: (prev.usp_per_product || []).filter((_, i) => i !== index)
    }))
  }

  const addObjection = () => {
    setInstructions(prev => ({
      ...prev,
      objection_handling: [...(prev.objection_handling || []), { objection: '', response: '' }]
    }))
  }

  const updateObjection = (index: number, field: 'objection' | 'response', value: string) => {
    setInstructions(prev => {
      const objections = [...(prev.objection_handling || [])]
      objections[index] = { ...objections[index], [field]: value }
      return { ...prev, objection_handling: objections }
    })
  }

  const removeObjection = (index: number) => {
    setInstructions(prev => ({
      ...prev,
      objection_handling: (prev.objection_handling || []).filter((_, i) => i !== index)
    }))
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
              <h1 className="text-xl font-bold text-gray-900 ml-4">🔬 AI Судалгааны мэдээлэл</h1>
            </div>
            <div className="flex items-center gap-3">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => { setEditMode(false); loadResearchData() }}>
                    Цуцлах
                  </Button>
                  <Button onClick={saveResearch} disabled={saving}>
                    {saving ? 'Хадгалж байна...' : 'Хадгалах'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Засах
                  </Button>
                  <Button onClick={regenerateResearch} disabled={regenerating}>
                    {regenerating ? 'Судалж байна...' : 'Дахин судлах'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!researchData?.ai_instructions ? (
          <Card className="text-center py-12">
            <div className="text-6xl mb-4">🔬</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Судалгаа байхгүй</h3>
            <p className="text-gray-500 mb-6">
              AI судалгаа хийхийн тулд эхлээд бүтээгдэхүүн нэмээд дараа нь AI-г сургана уу.
            </p>
            <Button onClick={regenerateResearch} disabled={regenerating}>
              {regenerating ? 'Судалж байна...' : 'AI судалгаа эхлүүлэх'}
            </Button>
          </Card>
        ) : (
          <>
            {/* Last Updated */}
            {researchData.last_research_at && (
              <div className="text-sm text-gray-500">
                Сүүлд шинэчилсэн: {new Date(researchData.last_research_at).toLocaleString('mn-MN')}
              </div>
            )}

            {/* Market Analysis */}
            <Card>
              <h3 className="font-semibold mb-3">📊 Зах зээлийн шинжилгээ</h3>
              {editMode ? (
                <textarea
                  value={instructions.market_analysis || ''}
                  onChange={(e) => updateField('market_analysis', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Зах зээлийн шинжилгээ..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.market_analysis || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

            {/* Target Audience */}
            <Card>
              <h3 className="font-semibold mb-3">🎯 Зорилтот үзэгчид</h3>
              {editMode ? (
                <textarea
                  value={instructions.target_audience || ''}
                  onChange={(e) => updateField('target_audience', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Зорилтот үзэгчдийн тодорхойлолт..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.target_audience || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

            {/* Customer Behavior */}
            <Card>
              <h3 className="font-semibold mb-3">👥 Хэрэглэгчийн зан төлөв</h3>
              {editMode ? (
                <textarea
                  value={instructions.customer_behavior || ''}
                  onChange={(e) => updateField('customer_behavior', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Хэрэглэгчийн зан төлөвийн шинжилгээ..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.customer_behavior || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

            {/* Brand Voice */}
            <Card>
              <h3 className="font-semibold mb-3">🎨 Брэндийн дуу хоолой</h3>
              {editMode ? (
                <textarea
                  value={instructions.brand_voice || ''}
                  onChange={(e) => updateField('brand_voice', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Брэндийн ярилцах хэв маяг..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.brand_voice || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

            {/* USP per Product */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">✨ Бүтээгдэхүүний USP</h3>
                {editMode && (
                  <Button size="sm" variant="outline" onClick={addUSP}>
                    + Нэмэх
                  </Button>
                )}
              </div>
              {(instructions.usp_per_product || []).length === 0 ? (
                <p className="text-gray-500">USP байхгүй</p>
              ) : (
                <div className="space-y-3">
                  {(instructions.usp_per_product || []).map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg ${editMode ? 'bg-gray-50' : 'bg-blue-50'}`}>
                      {editMode ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={item.product}
                            onChange={(e) => updateUSP(index, 'product', e.target.value)}
                            placeholder="Бүтээгдэхүүний нэр"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            value={item.usp}
                            onChange={(e) => updateUSP(index, 'usp', e.target.value)}
                            placeholder="USP"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => removeUSP(index)} className="text-red-500 text-sm">
                            Устгах
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-blue-800">{item.product}</div>
                          <div className="text-sm text-blue-700 mt-1">{item.usp}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Objection Handling */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">⚡ Эсэргүүцэл шийдвэрлэх</h3>
                {editMode && (
                  <Button size="sm" variant="outline" onClick={addObjection}>
                    + Нэмэх
                  </Button>
                )}
              </div>
              {(instructions.objection_handling || []).length === 0 ? (
                <p className="text-gray-500">Эсэргүүцэл байхгүй</p>
              ) : (
                <div className="space-y-3">
                  {(instructions.objection_handling || []).map((item, index) => (
                    <div key={index} className={`p-3 rounded-lg ${editMode ? 'bg-gray-50' : 'bg-yellow-50'}`}>
                      {editMode ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={item.objection}
                            onChange={(e) => updateObjection(index, 'objection', e.target.value)}
                            placeholder="Эсэргүүцэл (жнь: Үнэ өндөр)"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <textarea
                            value={item.response}
                            onChange={(e) => updateObjection(index, 'response', e.target.value)}
                            placeholder="Хариулт"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button onClick={() => removeObjection(index)} className="text-red-500 text-sm">
                            Устгах
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-medium text-yellow-800">❓ {item.objection}</div>
                          <div className="text-sm text-yellow-700 mt-1">→ {item.response}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Key Selling Points */}
            <Card>
              <h3 className="font-semibold mb-3">🔑 Гол борлуулалтын цэгүүд</h3>
              {editMode ? (
                <textarea
                  value={(instructions.key_selling_points || []).join('\n')}
                  onChange={(e) => updateField('key_selling_points', e.target.value.split('\n').filter(Boolean))}
                  rows={4}
                  placeholder="Мөр бүрт нэг цэг бичнэ үү..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {(instructions.key_selling_points || []).map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                  {(instructions.key_selling_points || []).length === 0 && (
                    <p className="text-gray-500">Мэдээлэл байхгүй</p>
                  )}
                </ul>
              )}
            </Card>

            {/* Info */}
            <Card className="bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">📌 Зөвлөмж</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Энэ мэдээллийг AI борлуулалтын туслах ашиглана</li>
                <li>• Та засвар оруулснаар AI илүү сайн ажиллана</li>
                <li>• "Дахин судлах" товч дарвал AI шинээр шинжилгээ хийнэ</li>
                <li>• Бүтээгдэхүүн нэмсний дараа дахин судлахыг санал болгоно</li>
              </ul>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
