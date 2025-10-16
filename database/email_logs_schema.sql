-- Tabla para registro de emails enviados
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  type TEXT NOT NULL, -- document_expiration, document_required, organizational_change, etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
  metadata JSONB DEFAULT '{}'::jsonb, -- Información adicional (document_id, employee_id, ai_generated, etc.)
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_metadata ON email_logs USING gin(metadata);

-- Habilitar Row Level Security
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
-- Solo admins pueden ver todos los logs
CREATE POLICY "Admins can view all email logs" ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Solo admins pueden insertar logs
CREATE POLICY "Admins can insert email logs" ON email_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE email_logs IS 'Registro de todos los emails enviados por el sistema de automatización';
COMMENT ON COLUMN email_logs.recipient IS 'Email del destinatario';
COMMENT ON COLUMN email_logs.subject IS 'Asunto del email';
COMMENT ON COLUMN email_logs.type IS 'Tipo de notificación enviada';
COMMENT ON COLUMN email_logs.status IS 'Estado del envío: pending, sent, failed';
COMMENT ON COLUMN email_logs.metadata IS 'Información adicional en formato JSON (document_id, employee_id, ai_generated, email_id de Resend, etc.)';
COMMENT ON COLUMN email_logs.error_message IS 'Mensaje de error si el envío falló';
COMMENT ON COLUMN email_logs.sent_at IS 'Timestamp del envío';
