/*
# Phase 3/4/5 Schema - Conversations, AI Assistant, Campaigns

## Overview
Adds tables for the Conversations unified inbox (P3), AI Assistant chat (P4), and Campaigns (P5).

## New Tables (5 total)
1. conversations - Unified inbox threads from email, WhatsApp, Facebook, Instagram, Jotform
2. messages - Individual messages within a conversation
3. ai_chat_sessions - AI assistant chat sessions
4. ai_chat_messages - Messages within an AI chat session
5. campaigns - Marketing campaigns with segment definitions

## Security
- RLS enabled on ALL new tables
- Organisation-scoped access using get_current_user_org() (existing helper)
- 4 policies per table (SELECT/INSERT/UPDATE/DELETE), scoped TO authenticated
*/

-- ============================================================
-- 1. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email',
  external_id text,
  subject text,
  status text DEFAULT 'open',
  priority text DEFAULT 'normal',
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org_id ON conversations(organisation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_id ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at);

CREATE TRIGGER set_updated_at_conversations BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  sender_type text NOT NULL DEFAULT 'customer',
  sender_name text,
  body text,
  attachments jsonb DEFAULT '[]'::jsonb,
  is_read boolean DEFAULT false,
  external_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_id ON messages(organisation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================================
-- 3. AI_CHAT_SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text DEFAULT 'New Chat',
  provider text DEFAULT 'openai',
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_org_id ON ai_chat_sessions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);

CREATE TRIGGER set_updated_at_ai_chat_sessions BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. AI_CHAT_MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);

-- ============================================================
-- 5. CAMPAIGNS
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  channel text DEFAULT 'email',
  status text DEFAULT 'draft',
  segment_rules jsonb DEFAULT '{}'::jsonb,
  audience_count integer DEFAULT 0,
  template_subject text,
  template_body text,
  sent_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(organisation_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: CONVERSATIONS
-- ============================================================
DROP POLICY IF EXISTS "select_conversations_own_org" ON conversations;
CREATE POLICY "select_conversations_own_org" ON conversations
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_conversations_own_org" ON conversations;
CREATE POLICY "insert_conversations_own_org" ON conversations
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_conversations_own_org" ON conversations;
CREATE POLICY "update_conversations_own_org" ON conversations
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_conversations_own_org" ON conversations;
CREATE POLICY "delete_conversations_own_org" ON conversations
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "select_messages_own_org" ON messages;
CREATE POLICY "select_messages_own_org" ON messages
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_messages_own_org" ON messages;
CREATE POLICY "insert_messages_own_org" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_messages_own_org" ON messages;
CREATE POLICY "update_messages_own_org" ON messages
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_messages_own_org" ON messages;
CREATE POLICY "delete_messages_own_org" ON messages
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: AI_CHAT_SESSIONS
-- ============================================================
DROP POLICY IF EXISTS "select_ai_chat_sessions_own_org" ON ai_chat_sessions;
CREATE POLICY "select_ai_chat_sessions_own_org" ON ai_chat_sessions
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_ai_chat_sessions_own_org" ON ai_chat_sessions;
CREATE POLICY "insert_ai_chat_sessions_own_org" ON ai_chat_sessions
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_ai_chat_sessions_own_org" ON ai_chat_sessions;
CREATE POLICY "update_ai_chat_sessions_own_org" ON ai_chat_sessions
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_ai_chat_sessions_own_org" ON ai_chat_sessions;
CREATE POLICY "delete_ai_chat_sessions_own_org" ON ai_chat_sessions
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: AI_CHAT_MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "select_ai_chat_messages_own_org" ON ai_chat_messages;
CREATE POLICY "select_ai_chat_messages_own_org" ON ai_chat_messages
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_ai_chat_messages_own_org" ON ai_chat_messages;
CREATE POLICY "insert_ai_chat_messages_own_org" ON ai_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_ai_chat_messages_own_org" ON ai_chat_messages;
CREATE POLICY "update_ai_chat_messages_own_org" ON ai_chat_messages
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_ai_chat_messages_own_org" ON ai_chat_messages;
CREATE POLICY "delete_ai_chat_messages_own_org" ON ai_chat_messages
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());

-- ============================================================
-- POLICIES: CAMPAIGNS
-- ============================================================
DROP POLICY IF EXISTS "select_campaigns_own_org" ON campaigns;
CREATE POLICY "select_campaigns_own_org" ON campaigns
  FOR SELECT TO authenticated
  USING (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "insert_campaigns_own_org" ON campaigns;
CREATE POLICY "insert_campaigns_own_org" ON campaigns
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "update_campaigns_own_org" ON campaigns;
CREATE POLICY "update_campaigns_own_org" ON campaigns
  FOR UPDATE TO authenticated
  USING (organisation_id = get_current_user_org())
  WITH CHECK (organisation_id = get_current_user_org());

DROP POLICY IF EXISTS "delete_campaigns_own_org" ON campaigns;
CREATE POLICY "delete_campaigns_own_org" ON campaigns
  FOR DELETE TO authenticated
  USING (organisation_id = get_current_user_org());