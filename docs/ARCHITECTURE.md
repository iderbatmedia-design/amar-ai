# AmarAI Platform - Бүрэн Архитектур

## 🎯 Төслийн зорилго

Монголын бизнесүүдэд зориулсан AI Sales Automation Platform.
Facebook/Instagram-аас ирсэн мессеж болон comment-д AI автоматаар хариулж, борлуулалт хийнэ.

**Гол ялгаа:** Бусад chatbot зөвхөн хариулдаг. AmarAI бол жинхэнэ борлуулагч шиг ажиллана.

---

## 👥 Хэрэглэгчийн түвшин

```
👤 End Customer          👔 Бизнес эзэн           👑 Admin (Платформ эзэн)
(Худалдан авагч)         (Манай харилцагч)
      │                        │                        │
      │                        │                        │
      ▼                        ▼                        ▼
 ┌─────────┐            ┌───────────┐           ┌───────────┐
 │ FB / IG │            │ Dashboard │           │   Admin   │
 │Messenger│            │           │           │   Panel   │
 │ Comment │            │           │           │           │
 └─────────┘            └───────────┘           └───────────┘
```

---

## 🏗️ Frontend бүтэц (Next.js)

```
/                               → Login/Register
/wizard                         → Төсөл үүсгэх (5 алхам)

/dashboard                      → Төслүүдийн жагсаалт
/dashboard/[projectId]
├── /overview                   → Тойм, статистик
├── /ai-coach                   → AI Зөвлөх (чатлах)
├── /chats                      → Харилцагчидтай яриа
├── /customers                  → CRM (hot/warm/cold)
├── /orders                     → Захиалгууд
├── /products                   → Бүтээгдэхүүн CRUD
├── /ai-settings                → AI тохиргоо
├── /analytics                  → Дэлгэрэнгүй тайлан
└── /settings                   → Төслийн тохиргоо + Бренд

/admin                          → (Зөвхөн admin эрхтэй)
├── /admin/dashboard            → Платформын статистик
├── /admin/businesses           → Бүх бизнесүүд
├── /admin/ai-training          → AI сургалт (ярилцах + файл upload)
└── /admin/settings             → API keys, систем
```

---

## 🔌 Backend API бүтэц

```
/api
├── /auth                       → Supabase Auth
├── /projects                   → CRUD
├── /products                   → CRUD + Media upload
├── /customers                  → CRUD + Classification
├── /orders                     → Захиалга CRUD
│
├── /ai
│   ├── /research               → Research Engine
│   ├── /chat                   → Sales Agent
│   ├── /classify               → Classifier
│   ├── /coach                  → AI Coach (бизнес эзэнд)
│   └── /training               → Admin AI сургалт
│
├── /webhooks
│   ├── /facebook               → FB Messenger + Comment
│   └── /instagram              → IG Direct + Comment
│
└── /admin                      → Admin-only endpoints
```

---

## 🤖 AI System (3+1 AI)

### AI #1: Research Engine
- **Хэзээ:** Төсөл үүсгэхэд 1 удаа
- **Input:** Бизнес мэдээлэл + Бүтээгдэхүүн + Бренд
- **Output:**
  - Зорилтот хэрэглэгч (demographics, psychographics)
  - USP (Unique Selling Proposition)
  - Benefit hierarchy
  - Эсэргүүцэл + хариулт
  - Борлуулалтын өнцөг
  - Түгээмэл асуултууд

### AI #2: Sales Agent
- **Хэзээ:** Мессеж/Comment бүрт real-time
- **Input:**
  - Incoming message
  - Business data (Research + Brand + Products)
  - Conversation history
  - Customer data
  - Base knowledge (Admin сургасан)
- **Output:**
  - Response message
  - Media to send
  - Confidence score (0-100)
  - Хэрэв confidence < 70% → Human handoff

### AI #3: Classifier Engine
- **Хэзээ:** Яриа дуусахад (X минут идэвхгүй)
- **Input:** Full conversation
- **Output:**
  - Classification: hot/warm/cold
  - Interested products
  - Detected scenario: self/gift/child/business
  - Follow-up timing: 24h/48h/1week
  - Phone collected
  - Notes

### AI #4: AI Coach (Бизнес эзэнд)
- **Хэзээ:** Бизнес эзэн хүсэхэд
- **Input:** Тухайн бизнесийн бүх data
- **Output:**
  - Борлуулалтын зөвлөгөө
  - Follow-up текст бичих
  - Пост/Reels текст бичих
  - Яриа шинжилгээ

---

## 💾 Database Schema

### Core Tables

```sql
-- Users (Манай харилцагч + Admin)
users
├── id, email, name, phone
├── role: 'user' | 'admin'
├── plan: 'free' | 'trial' | 'basic' | 'pro'
├── trial_ends_at
└── created_at

-- Projects (Бизнес бүр = 1 Project)
projects
├── id, user_id, name
├── business_type: 'online_retail' | 'physical_retail' | 'service' | 'digital'
├── industry
├── description
├── ai_name, ai_tone
├── status: 'active' | 'paused'
└── created_at

-- Brand Profile
brand_profiles
├── id, project_id
├── slogan
├── founding_year
├── mission_vision
├── values (JSONB)
├── brand_voice: 'formal' | 'friendly' | 'youthful' | 'luxury'
├── brand_story
├── never_say (JSONB) -- Хэзээ ч хэлэхгүй зүйлс
└── updated_at

-- Products
products
├── id, project_id
├── name, description
├── price, stock
├── features (JSONB)
└── created_at

-- Product Media
product_media
├── id, product_id
├── type: 'image' | 'video' | 'document'
├── url, thumbnail_url
├── caption
├── ai_description -- AI боловсруулсан
├── is_primary
└── sort_order

-- Research Data (AI судалгаа)
research_data
├── id, project_id
├── target_audience (JSONB)
├── benefits (JSONB)
├── sales_angles (JSONB)
├── suggested_questions (JSONB)
├── objections (JSONB)
├── buyer_scenarios (JSONB)
├── warnings (JSONB)
├── custom_notes
└── updated_at

-- Social Accounts
social_accounts
├── id, project_id
├── platform: 'facebook' | 'instagram'
├── platform_page_id
├── page_name
├── access_token
└── connected_at

-- Customers (End customers)
customers
├── id, project_id
├── platform, platform_user_id
├── name, phone
├── classification: 'hot' | 'warm' | 'cold'
├── interested_products (UUID[])
├── detected_scenario
├── notes
├── first_contact, last_contact
└── created_at

-- Conversations
conversations
├── id, customer_id
├── role: 'user' | 'assistant'
├── message
├── media_urls (TEXT[])
├── ai_confidence
└── created_at

-- Orders
orders
├── id, project_id, customer_id
├── visible_id -- #001, #002
├── status: 'new' | 'confirmed' | 'shipping' | 'done' | 'cancelled'
├── products (JSONB) -- [{product_id, quantity, price}]
├── total_amount
├── customer_name, customer_phone
├── delivery_address, delivery_notes
├── created_at, confirmed_at, shipped_at, completed_at
└── notes

-- Project Settings
project_settings
├── id, project_id
├── website_url
├── website_link_rules (JSONB)
├── delivery_info
├── business_phone
├── business_hours
├── auto_reply_outside_hours
└── updated_at
```

### Admin Tables

```sql
-- AI Base Knowledge (Admin сургалт)
ai_base_knowledge
├── id
├── category: 'sales_technique' | 'objection_handling' | 'mongolian_slang' | 'conversation_style'
├── title
├── content (TEXT)
├── is_active
└── updated_at

-- AI Training Files (Upload хийсэн файлууд)
ai_training_files
├── id
├── filename
├── file_url
├── file_type
├── processed_content (TEXT)
├── uploaded_at
└── processed_at

-- AI Training Conversations (Admin ↔ AI яриа)
ai_training_conversations
├── id
├── role: 'user' | 'assistant'
├── message
└── created_at

-- AI Coach Conversations (Бизнес эзэн ↔ AI Coach)
ai_coach_conversations
├── id, project_id
├── role: 'user' | 'assistant'
├── message
└── created_at

-- Daily Analytics
daily_analytics
├── id, project_id, date
├── total_chats, total_customers
├── hot_leads, warm_leads, cold_leads
├── orders_count, revenue
├── avg_response_time
├── ai_success_rate
└── human_handoff_count
```

---

## 🔄 Message Flow

```
Customer ──► FB/IG ──► Webhook ──► AmarAI Backend
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Customer шинэ?  │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Context бүрдүүлэх│
                              │ - Customer data  │
                              │ - Products       │
                              │ - Research       │
                              │ - Brand          │
                              │ - Base knowledge │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  AI Sales Agent │
                              │   (GPT-4o)      │
                              └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                        confidence > 70%   confidence < 70%
                              │                 │
                              ▼                 ▼
                        ┌──────────┐     ┌──────────────┐
                        │ Хариулт  │     │Human handoff │
                        │ илгээх   │     │+ Notification│
                        └──────────┘     └──────────────┘
```

---

## 🔔 Notification System

```
🔴 Яаралтай (Push + SMS):
   - Хэрэглэгч уурласан
   - AI чадахгүй (human handoff)
   - Шинэ захиалга

🟡 Чухал (Push):
   - Hot lead илэрсэн
   - Хэрэглэгч утас өгсөн

🟢 Мэдээлэл (App дотор):
   - Өдрийн тойм
   - Шинэ яриа
```

---

## 🗣️ AI Ярианы дүрэм

### Хэв маяг
- Casual, найрсаг: "hey", "сайн уу"
- Хэт албан ёсны биш
- Монгол галиг ойлгодог: "snuu" = "сайн уу", "bna" = "байна"

### Борлуулалтын алхам
1. Мэндчилгээ (casual)
2. Хэрэгцээ тодорхойлох (асуулт асуух)
3. Бүтээгдэхүүн танилцуулах (USP + үнэ)
4. Эсэргүүцэл шийдэх
5. Захиалга авах / Follow-up

### Жишээ
```
Хэрэглэгч: "Сайн уу"
AI: "Hey сайн уу! Ямар бүтээгдэхүүний талаар мэдээлэл авах уу?"

Хэрэглэгч: "Цүнх үнэ хэд вэ?"
AI: "Манай цүнх Италийн арьсан, гар урлал. 150,000₮.
     Та өөртөө авах уу, бэлэгт юу?"

Хэрэглэгч: "Үнэтэй байна"
AI: [Бизнес эзний урьдчилж бичсэн хариулт]
```

### Хязгаарлалт
- Худал мэдээлэл өгөхгүй
- Өрсөлдөгчийг муулахгүй
- Бизнес эзэн зөвшөөрөөгүй хямдрал амлахгүй
- Мэдээлэл байхгүй бол утасны дугаар руу чиглүүлнэ

### Онцгой нөхцөл
- Уурлавал → Тайвшруулах + бизнес эзэнд notification
- Галиг ойлгохгүй бол → "Монголоор бичнэ үү"
- Холбоогүй асуулт → Хариулаад бүтээгдэхүүн рүү чиглүүлэх

---

## 🔌 External Services

| Service | Зориулалт |
|---------|-----------|
| Meta Graph API | FB/IG Messenger, Comments, Pages |
| OpenAI API (GPT-4o) | AI chat, embedding |
| Supabase | Database, Auth, Storage, Realtime |
| Vercel | Hosting, Deploy |

### Ирээдүйд
- QPay/SocialPay - Төлбөр
- Firebase - Push notifications
- Voice AI - Утсаар ярих

---

## 📱 Төсөл үүсгэх Wizard (5 алхам)

1. **Бизнесийн төрөл**
   - Online борлуулалт
   - Лангууны борлуулалт
   - Үйлчилгээ
   - Digital үйлчилгээ

2. **Категори** (төрлөөс хамаарсан)

3. **Бизнесийн мэдээлэл**
   - Нэр
   - Тайлбар

4. **Брендийн мэдээлэл** (товч)
   - Слоган/уриа
   - Үнэт зүйлс

5. **AI тохиргоо**
   - AI нэр
   - Ярианы хэв маяг

---

## 💰 Pricing Model

- **Trial:** 7-10 хоног үнэгүй
- **Basic:** ?₮/сар
- **Pro:** ?₮/сар

*AI зардал (OpenAI token) тооцоолох хэрэгтэй*

---

## 🚀 Development Phases

### Phase 1: MVP (3-4 хоног)
- [x] Auth + Dashboard
- [x] Project Wizard
- [x] Products CRUD
- [ ] AI Research Engine
- [ ] AI Sales Agent
- [ ] FB/IG Webhook
- [ ] Харилцагч ангилал
- [ ] Human handoff + Notification

### Phase 2: Сайжруулалт
- [ ] AI Coach
- [ ] Orders system
- [ ] Follow-up функц
- [ ] Analytics dashboard
- [ ] Brand profile (дэлгэрэнгүй)

### Phase 3: Ирээдүй
- [ ] Төлбөрийн integration
- [ ] Website chat widget
- [ ] Voice AI
- [ ] Multi-language

---

## 📁 Project Structure

```
amarai/
├── app/
│   ├── page.tsx                    # Login
│   ├── wizard/                     # Төсөл үүсгэх
│   ├── dashboard/                  # Бизнес эзний dashboard
│   │   └── [projectId]/
│   │       ├── overview/
│   │       ├── ai-coach/
│   │       ├── chats/
│   │       ├── customers/
│   │       ├── orders/
│   │       ├── products/
│   │       ├── ai-settings/
│   │       ├── analytics/
│   │       └── settings/
│   ├── admin/                      # Admin panel
│   │   ├── dashboard/
│   │   ├── businesses/
│   │   ├── ai-training/
│   │   └── settings/
│   ├── api/
│   │   ├── auth/
│   │   ├── projects/
│   │   ├── products/
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── ai/
│   │   │   ├── research/
│   │   │   ├── chat/
│   │   │   ├── classify/
│   │   │   ├── coach/
│   │   │   └── training/
│   │   ├── webhooks/
│   │   │   ├── facebook/
│   │   │   └── instagram/
│   │   └── admin/
│   └── lib/
│       ├── supabase.ts
│       ├── openai.ts
│       └── meta-api.ts
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── chat/
│   └── admin/
├── types/
│   └── index.ts
├── docs/
│   └── ARCHITECTURE.md             # ЭНЭ ФАЙЛ
└── prompts/                        # AI prompt templates
    ├── research-engine.ts
    ├── sales-agent.ts
    ├── classifier.ts
    └── coach.ts
```

---

*Сүүлд шинэчилсэн: 2026-01-15*
