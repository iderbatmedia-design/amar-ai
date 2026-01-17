-- AmarAI Platform - Database Updates
-- Шинэ функцүүдийн хэрэглэхэд шаардлагатай column-үүд

-- 1. Customers хүснэгт
ALTER TABLE customers ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMPTZ;

-- 2. Conversations хүснэгт
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- 3. Orders хүснэгт
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Default values for existing records
UPDATE conversations SET ai_enabled = true WHERE ai_enabled IS NULL;
UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL;

-- ============================================
-- TEAM SYSTEM - Багийн удирдлага
-- ============================================

-- 4. Team Members хүснэгт - Төслийн багийн гишүүд
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    permissions JSONB DEFAULT '{"view": true, "edit": false, "manage_orders": false, "manage_customers": false, "reply_messages": false, "manage_products": false, "manage_settings": false}'::jsonb,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 5. Team Invitations хүснэгт - Урилга
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    permissions JSONB DEFAULT '{"view": true, "edit": false, "manage_orders": false, "manage_customers": false, "reply_messages": false, "manage_products": false, "manage_settings": false}'::jsonb,
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index үүд
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- Төсөл үүсгэхэд owner автоматаар нэмэгдэнэ (trigger)
CREATE OR REPLACE FUNCTION add_owner_as_team_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO team_members (project_id, user_id, role, status, accepted_at, permissions)
    VALUES (
        NEW.id,
        NEW.user_id,
        'owner',
        'active',
        NOW(),
        '{"view": true, "edit": true, "manage_orders": true, "manage_customers": true, "reply_messages": true, "manage_products": true, "manage_settings": true}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger үүсгэх (байхгүй бол)
DROP TRIGGER IF EXISTS trigger_add_owner_team_member ON projects;
CREATE TRIGGER trigger_add_owner_team_member
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION add_owner_as_team_member();

-- Одоо байгаа projects-д owner нэмэх
INSERT INTO team_members (project_id, user_id, role, status, accepted_at, permissions)
SELECT
    id as project_id,
    user_id,
    'owner' as role,
    'active' as status,
    NOW() as accepted_at,
    '{"view": true, "edit": true, "manage_orders": true, "manage_customers": true, "reply_messages": true, "manage_products": true, "manage_settings": true}'::jsonb as permissions
FROM projects
WHERE NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.project_id = projects.id AND tm.user_id = projects.user_id
);
