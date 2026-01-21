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
  business_summary?: string
  core_value_proposition?: string
  sales_channel?: 'website' | 'delivery' | 'both'
  is_digital_product?: boolean
  purchase_instructions?: string
  market_analysis?: string
  target_audience?: string
  customer_psychology?: {
    pain_points?: string[]
    desires?: string[]
    fears?: string[]
    buying_triggers?: string[]
  }
  customer_behavior?: string
  brand_voice?: string
  key_selling_points?: string[]
  usp_per_product?: Array<{
    product: string
    usp: string
    elevator_pitch?: string
    transformation?: string
  }>
  product_knowledge?: Array<{
    product_name: string
    product_type: string
    short_pitch: string
    detailed_description?: string
    benefits: string[]
    features?: string[]
    ideal_for: string
    not_for?: string
    how_to_buy: string
  }>
  sales_scripts?: {
    opening?: string
    qualifying?: string
    presenting?: string
    closing?: string
    follow_up?: string
  }
  common_questions?: Array<{ question: string; answer: string }>
  objection_handling?: Array<{ objection: string; response: string }>
  urgency_tactics?: string[]
  social_proof?: string
  sales_tips?: string[]
  greeting_style?: string
  tone_guidelines?: string
  do_not_say?: string[]
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

            {/* Business Summary */}
            <Card>
              <h3 className="font-semibold mb-3">💼 Бизнесийн товч танилцуулга</h3>
              {editMode ? (
                <textarea
                  value={instructions.business_summary || ''}
                  onChange={(e) => updateField('business_summary', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Бизнесийн товч тайлбар..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.business_summary || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

            {/* Sales Channel & Digital Product */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <h3 className="font-semibold mb-3">🛒 Борлуулалтын суваг</h3>
                {editMode ? (
                  <select
                    value={instructions.sales_channel || 'both'}
                    onChange={(e) => updateField('sales_channel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="website">Вэбсайт (Онлайн захиалга)</option>
                    <option value="delivery">Хүргэлт (Хаяг авах)</option>
                    <option value="both">Хоёулаа</option>
                  </select>
                ) : (
                  <p className="text-gray-700">
                    {instructions.sales_channel === 'website' && '🌐 Вэбсайт (Онлайн захиалга)'}
                    {instructions.sales_channel === 'delivery' && '🚚 Хүргэлт (Хаяг авах)'}
                    {instructions.sales_channel === 'both' && '🌐🚚 Вэбсайт + Хүргэлт'}
                    {!instructions.sales_channel && 'Тодорхойгүй'}
                  </p>
                )}
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">📱 Дижитал бүтээгдэхүүн</h3>
                {editMode ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={instructions.is_digital_product || false}
                      onChange={(e) => updateField('is_digital_product', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span>Тийм (PDF, Онлайн курс гэх мэт)</span>
                  </label>
                ) : (
                  <p className="text-gray-700">
                    {instructions.is_digital_product ? '✅ Тийм - Хүргэлт шаардлагагүй' : '📦 Үгүй - Биет бүтээгдэхүүн'}
                  </p>
                )}
              </Card>
            </div>

            {/* Purchase Instructions */}
            <Card>
              <h3 className="font-semibold mb-3">📝 Захиалга хийх заавар</h3>
              {editMode ? (
                <textarea
                  value={instructions.purchase_instructions || ''}
                  onChange={(e) => updateField('purchase_instructions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Хэрхэн захиалга өгөх тухай заавар..."
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {instructions.purchase_instructions || 'Мэдээлэл байхгүй'}
                </p>
              )}
            </Card>

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

            {/* Customer Psychology */}
            {instructions.customer_psychology && (
              <Card>
                <h3 className="font-semibold mb-3">🧠 Хэрэглэгчийн сэтгэл зүй</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pain Points */}
                  <div className="bg-red-50 p-3 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">😣 Өвдөлтийн цэгүүд</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {(instructions.customer_psychology.pain_points || []).map((point, i) => (
                        <li key={i}>• {point}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Desires */}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">✨ Хүсэл тэмүүлэл</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      {(instructions.customer_psychology.desires || []).map((desire, i) => (
                        <li key={i}>• {desire}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Fears */}
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">😰 Айдас</h4>
                    <ul className="text-sm text-purple-700 space-y-1">
                      {(instructions.customer_psychology.fears || []).map((fear, i) => (
                        <li key={i}>• {fear}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Buying Triggers */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">🎯 Худалдан авах триггер</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {(instructions.customer_psychology.buying_triggers || []).map((trigger, i) => (
                        <li key={i}>• {trigger}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            {/* Sales Scripts */}
            {instructions.sales_scripts && (
              <Card>
                <h3 className="font-semibold mb-3">📜 Борлуулалтын скриптүүд</h3>
                <div className="space-y-4">
                  {instructions.sales_scripts.opening && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-1">🎬 Яриа эхлүүлэх</h4>
                      <p className="text-sm text-blue-700">{instructions.sales_scripts.opening}</p>
                    </div>
                  )}
                  {instructions.sales_scripts.qualifying && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-1">❓ Хэрэгцээ тодорхойлох</h4>
                      <p className="text-sm text-green-700">{instructions.sales_scripts.qualifying}</p>
                    </div>
                  )}
                  {instructions.sales_scripts.presenting && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <h4 className="font-medium text-purple-800 mb-1">🎁 Танилцуулах</h4>
                      <p className="text-sm text-purple-700">{instructions.sales_scripts.presenting}</p>
                    </div>
                  )}
                  {instructions.sales_scripts.closing && (
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-1">🎯 Хаалт хийх</h4>
                      <p className="text-sm text-orange-700">{instructions.sales_scripts.closing}</p>
                    </div>
                  )}
                  {instructions.sales_scripts.follow_up && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-1">📞 Дахин холбогдох</h4>
                      <p className="text-sm text-gray-700">{instructions.sales_scripts.follow_up}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

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
