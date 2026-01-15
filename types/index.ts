// Database Types for AmarAI

// User - Манай харилцагч (Бизнес эзэд)
export interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  plan: 'free' | 'basic' | 'pro'
  created_at: string
}

// Project - Бизнес бүр = 1 Project
export interface Project {
  id: string
  user_id: string
  name: string
  industry: string | null
  description: string | null
  ai_name: string
  ai_tone: 'friendly' | 'professional' | 'casual'
  status: 'active' | 'paused' | 'archived'
  created_at: string
}

// Social Account - FB/IG холболт
export interface SocialAccount {
  id: string
  project_id: string
  platform: 'facebook' | 'instagram'
  platform_page_id: string
  page_name: string | null
  access_token: string | null
  connected_at: string
}

// Product - Бүтээгдэхүүн
export interface Product {
  id: string
  project_id: string
  name: string
  description: string | null
  price: number | null
  features: string[] | null
  stock: number
  created_at: string
}

// Product Media - Зураг, Видео
export interface ProductMedia {
  id: string
  product_id: string
  type: 'image' | 'video'
  url: string
  caption: string | null
  sort_order: number
  created_at: string
}

// Research Data - AI судалгааны үр дүн
export interface ResearchData {
  id: string
  project_id: string
  target_audience: TargetAudience | null
  benefits: Benefits | null
  sales_angles: SalesAngle[] | null
  suggested_questions: string[] | null
  objections: Objection[] | null
  buyer_scenarios: BuyerScenario[] | null
  warnings: Warning[] | null
  custom_notes: string | null
  updated_at: string
}

export interface TargetAudience {
  demographics: string[]
  psychographics: string[]
  pain_points: string[]
}

export interface Benefits {
  primary: string[]
  secondary: string[]
  ultimate: string[]
}

export interface SalesAngle {
  name: string
  description: string
  example_message: string
}

export interface Objection {
  objection: string
  response: string
  is_ai: boolean
  is_active: boolean
}

export interface BuyerScenario {
  icon: string
  name: string
  description: string
  ai_instruction: string
}

export interface Warning {
  type: 'price' | 'stock' | 'custom'
  condition: string
  message: string
}

// Customer - Харилцагчийн харилцагч (end customer)
export interface Customer {
  id: string
  project_id: string
  platform: 'facebook' | 'instagram'
  platform_user_id: string
  name: string | null
  phone: string | null
  classification: 'hot' | 'warm' | 'cold'
  interested_products: string[] | null
  detected_scenario: 'self' | 'gift' | 'child' | 'business' | null
  notes: string | null
  first_contact: string
  last_contact: string | null
}

// Conversation - Яриа түүх
export interface Conversation {
  id: string
  customer_id: string
  role: 'user' | 'assistant'
  message: string
  media_urls: string[] | null
  ai_confidence: number | null
  created_at: string
}

// Daily Analytics - Өдөр бүрийн статистик
export interface DailyAnalytics {
  id: string
  project_id: string
  date: string
  total_chats: number
  total_customers: number
  hot_leads: number
  conversions: number
  revenue: number
  avg_response_time: number | null
  ai_success_rate: number | null
}

// AI Classification Result
export interface ClassificationResult {
  classification: 'hot' | 'warm' | 'cold'
  interested_products: string[]
  detected_scenario: 'self' | 'gift' | 'child' | 'business'
  needs_followup: boolean
  followup_timing: '24h' | '48h' | '1week' | null
  phone_collected: string | null
  notes: string
}

// AI Sales Agent Response
export interface SalesAgentResponse {
  message: string
  media_to_send: string[] | null
  confidence: number
}
