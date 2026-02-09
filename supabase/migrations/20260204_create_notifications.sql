-- Tabla de notificaciones in-app
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    
    CONSTRAINT valid_notification_type CHECK (
        type IN ('contract_renewal', 'lead_followup', 'task_reminder', 'status_change', 'general')
    )
);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Tabla de configuración de notificaciones por usuario
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Preferencias de email
    email_contract_renewal BOOLEAN DEFAULT TRUE,
    email_lead_followup BOOLEAN DEFAULT TRUE,
    email_task_reminder BOOLEAN DEFAULT TRUE,
    email_status_change BOOLEAN DEFAULT FALSE,
    
    -- Preferencias in-app
    inapp_contract_renewal BOOLEAN DEFAULT TRUE,
    inapp_lead_followup BOOLEAN DEFAULT TRUE,
    inapp_task_reminder BOOLEAN DEFAULT TRUE,
    inapp_status_change BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification settings"
    ON notification_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
    ON notification_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
    ON notification_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);
