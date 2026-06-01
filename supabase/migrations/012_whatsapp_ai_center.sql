-- ====================================================
-- GMG Cobranzas — WhatsApp AI Center Schema
-- ====================================================

-- 1. Tabla global de configuración WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id SERIAL PRIMARY KEY,
  pdf_destination_number TEXT,
  bot_active BOOLEAN DEFAULT TRUE,
  cooldown_minutes INTEGER DEFAULT 30,
  daily_send_limit INTEGER DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.whatsapp_config (id, pdf_destination_number, bot_active)
VALUES (1, '00000000', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. Conversaciones
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefono TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  estado TEXT DEFAULT 'ABIERTO', -- ABIERTO, CERRADO, REQUIERE_AGENTE
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_conv_telefono ON public.whatsapp_conversations(telefono);
CREATE INDEX idx_wa_conv_cliente ON public.whatsapp_conversations(cliente_id);

-- 3. Mensajes
CREATE TYPE wa_sender_type AS ENUM ('CLIENT', 'BOT', 'AGENT');

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  sender_type wa_sender_type NOT NULL,
  agente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_intent TEXT,
  ai_risk TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msg_conv ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_wa_msg_timestamp ON public.whatsapp_messages(timestamp);

-- 4. Métricas y Logs de IA
CREATE TABLE IF NOT EXISTS public.ai_analysis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  detected_promise BOOLEAN DEFAULT FALSE,
  detected_followup BOOLEAN DEFAULT FALSE,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Tabla de envíos PDF
CREATE TABLE IF NOT EXISTS public.pdf_reports_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sent_to TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Allowing all for now since it's a backend integration, but typically we secure this)
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_config_all" ON public.whatsapp_config FOR ALL USING (true);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_conv_all" ON public.whatsapp_conversations FOR ALL USING (true);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_msg_all" ON public.whatsapp_messages FOR ALL USING (true);

ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs_all" ON public.ai_analysis_logs FOR ALL USING (true);

ALTER TABLE public.pdf_reports_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_logs_all" ON public.pdf_reports_log FOR ALL USING (true);
