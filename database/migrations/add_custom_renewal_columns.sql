-- Migración: Agregar columnas de renovación personalizada a employee_document_requirements
-- Fecha: 2025-10-03
-- Descripción: Permite configurar períodos de renovación personalizados por empleado

-- Agregar columnas para renovación personalizada
ALTER TABLE employee_document_requirements
ADD COLUMN IF NOT EXISTS has_custom_renewal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_renewal_period INTEGER,
ADD COLUMN IF NOT EXISTS custom_renewal_unit TEXT CHECK (custom_renewal_unit IN ('days', 'months', 'years'));

-- Agregar comentarios a las columnas
COMMENT ON COLUMN employee_document_requirements.has_custom_renewal IS 'Indica si este documento tiene un período de renovación personalizado diferente al del tipo de documento';
COMMENT ON COLUMN employee_document_requirements.custom_renewal_period IS 'Número de unidades del período de renovación personalizado (ej: 6 para "6 meses")';
COMMENT ON COLUMN employee_document_requirements.custom_renewal_unit IS 'Unidad del período de renovación personalizado: days, months, o years';

-- Crear índice para consultas de documentos con renovación personalizada
CREATE INDEX IF NOT EXISTS idx_employee_document_requirements_custom_renewal
ON employee_document_requirements(has_custom_renewal)
WHERE has_custom_renewal = TRUE;

-- Validación: custom_renewal_period y custom_renewal_unit deben estar presentes juntos
ALTER TABLE employee_document_requirements
ADD CONSTRAINT check_custom_renewal_fields
CHECK (
  (has_custom_renewal = FALSE AND custom_renewal_period IS NULL AND custom_renewal_unit IS NULL)
  OR
  (has_custom_renewal = TRUE AND custom_renewal_period IS NOT NULL AND custom_renewal_unit IS NOT NULL)
);

-- Log de migración aplicada
DO $$
BEGIN
  RAISE NOTICE 'Migración completada: Columnas de renovación personalizada agregadas a employee_document_requirements';
END $$;
