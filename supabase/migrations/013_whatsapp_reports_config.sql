-- Migration 013: WhatsApp Reports Configuration

-- 1. whatsapp_config
CREATE TABLE whatsapp_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_number TEXT,
    schedule_time TIME NOT NULL DEFAULT '18:00:00',
    send_excel BOOLEAN NOT NULL DEFAULT true,
    send_pdf BOOLEAN NOT NULL DEFAULT true,
    send_summary BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row exists for config
CREATE UNIQUE INDEX whatsapp_config_single_row ON whatsapp_config ((1));

-- Insert default config
INSERT INTO whatsapp_config (schedule_time, is_active) VALUES ('18:00:00', true) ON CONFLICT DO NOTHING;

-- 2. whatsapp_report_recipients
CREATE TABLE whatsapp_report_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT NOT NULL,
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. whatsapp_logs
CREATE TABLE whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    from_number TEXT,
    to_number TEXT,
    message_type TEXT NOT NULL,
    status TEXT NOT NULL,
    error_detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_report_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Allow ADMIN and SUPERVISOR to manage config
CREATE POLICY "Admin and Supervisor can manage whatsapp_config" 
ON whatsapp_config FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

-- Allow service role full access (for NestJS backend)
CREATE POLICY "Service role can manage whatsapp_config" 
ON whatsapp_config FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Same for recipients
CREATE POLICY "Admin and Supervisor can manage whatsapp_report_recipients" 
ON whatsapp_report_recipients FOR ALL 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

CREATE POLICY "Service role can manage whatsapp_report_recipients" 
ON whatsapp_report_recipients FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Same for logs
CREATE POLICY "Admin and Supervisor can read whatsapp_logs" 
ON whatsapp_logs FOR SELECT 
USING (
  auth.uid() IN (SELECT id FROM perfiles WHERE rol IN ('ADMIN', 'SUPERVISOR'))
);

CREATE POLICY "Service role can manage whatsapp_logs" 
ON whatsapp_logs FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');
