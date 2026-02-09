-- Tabla para guardar comparativas realizadas
CREATE TABLE saved_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Parámetros de entrada
    consumption_p1 NUMERIC NOT NULL,
    consumption_p2 NUMERIC NOT NULL,
    consumption_p3 NUMERIC NOT NULL,
    contracted_power_p1 NUMERIC,
    contracted_power_p2 NUMERIC,
    
    -- Resultados (JSON con todas las tarifas calculadas)
    results JSONB NOT NULL,
    
    -- Metadata
    name TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_comparisons_user_id ON saved_comparisons(user_id);
CREATE INDEX idx_saved_comparisons_customer_id ON saved_comparisons(customer_id);
CREATE INDEX idx_saved_comparisons_created_at ON saved_comparisons(created_at DESC);

ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own comparisons"
    ON saved_comparisons FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comparisons"
    ON saved_comparisons FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comparisons"
    ON saved_comparisons FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comparisons"
    ON saved_comparisons FOR DELETE
    USING (auth.uid() = user_id);
