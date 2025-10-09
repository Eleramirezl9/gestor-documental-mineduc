-- ========================================
-- Script de datos de prueba para Sistema de Renovaciones
-- ========================================
-- Este script crea documentos aprobados con fechas calculadas
-- para que aparezcan en el dashboard de renovaciones

-- Paso 1: Verificar que existan empleados
DO $$
DECLARE
  employee_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO employee_count FROM employees;

  IF employee_count = 0 THEN
    RAISE NOTICE 'ADVERTENCIA: No hay empleados en la base de datos';
    RAISE NOTICE 'Por favor, crea al menos un empleado primero';
  ELSE
    RAISE NOTICE 'Empleados encontrados: %', employee_count;
  END IF;
END $$;

-- Paso 2: Insertar documentos aprobados con diferentes fechas de vencimiento
-- Usamos los tipos de documento que YA EXISTEN y tienen renovación configurada

-- ============================================
-- URGENTE: Curriculum Vitae que vence en 5 días
-- ============================================
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at,
  notes
)
SELECT
  id,
  'Curriculum Vitae',
  'CV actualizado - Prueba de renovación urgente',
  CURRENT_DATE + INTERVAL '10 days',
  'approved',
  'high',
  -- Calculado: Si renovación es 12 meses y queremos que venza en 5 días
  -- approved_at = ahora - (12 meses - 5 días) = ahora - 360 días + 5 días = ahora - 355 días
  CURRENT_DATE - INTERVAL '355 days',
  'Documento de prueba - vence en 5 días'
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM employee_document_requirements
  WHERE document_type = 'Curriculum Vitae'
  AND status = 'approved'
  AND notes LIKE '%Documento de prueba%'
)
LIMIT 1;

-- ============================================
-- ALTA PRIORIDAD: Certificado de Antecedentes que vence en 12 días
-- ============================================
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at,
  notes
)
SELECT
  id,
  'Certificado de Antecedentes Penales',
  'Certificado de antecedentes - Prueba alta prioridad',
  CURRENT_DATE + INTERVAL '15 days',
  'approved',
  'medium',
  -- Calculado: Si renovación es 12 meses y queremos que venza en 12 días
  -- approved_at = ahora - (12 meses - 12 días) = ahora - 353 días
  CURRENT_DATE - INTERVAL '353 days',
  'Documento de prueba - vence en 12 días'
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM employee_document_requirements
  WHERE document_type = 'Certificado de Antecedentes Penales'
  AND status = 'approved'
  AND notes LIKE '%Documento de prueba%'
)
ORDER BY RANDOM()
LIMIT 1;

-- ============================================
-- PRIORIDAD MEDIA: Fotografía que vence en 28 días
-- ============================================
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at,
  notes
)
SELECT
  id,
  'Fotografía Reciente',
  'Fotografía actualizada - Prueba prioridad media',
  CURRENT_DATE + INTERVAL '30 days',
  'approved',
  'medium',
  -- Calculado: Si renovación es 24 meses y queremos que venza en 28 días
  -- approved_at = ahora - (24 meses - 28 días) = ahora - 700 días
  CURRENT_DATE - INTERVAL '700 days',
  'Documento de prueba - vence en 28 días'
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM employee_document_requirements
  WHERE document_type = 'Fotografía Reciente'
  AND status = 'approved'
  AND notes LIKE '%Documento de prueba%'
)
ORDER BY RANDOM()
LIMIT 1;

-- ============================================
-- VENCIDO: Curriculum que ya venció hace 3 días
-- ============================================
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at,
  notes
)
SELECT
  id,
  'Curriculum Vitae',
  'CV - Prueba documento vencido',
  CURRENT_DATE - INTERVAL '5 days',
  'approved',
  'urgent',
  -- Calculado: Si renovación es 12 meses y queremos que haya vencido hace 3 días
  -- approved_at = ahora - (12 meses + 3 días) = ahora - 368 días
  CURRENT_DATE - INTERVAL '368 days',
  'Documento de prueba - YA VENCIDO hace 3 días'
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM employee_document_requirements
  WHERE notes = 'Documento de prueba - YA VENCIDO hace 3 días'
)
ORDER BY RANDOM()
LIMIT 1;

-- ============================================
-- DOCUMENTO CON RENOVACIÓN PERSONALIZADA
-- ============================================
-- Certificado de Antecedentes con renovación personalizada de 3 meses (vence en 2 días)
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at,
  has_custom_renewal,
  custom_renewal_period,
  custom_renewal_unit,
  notes
)
SELECT
  id,
  'Certificado de Antecedentes Penales',
  'Certificado con renovación personalizada',
  CURRENT_DATE + INTERVAL '5 days',
  'approved',
  'urgent',
  -- Renovación personalizada de 3 meses, vence en 2 días
  -- approved_at = ahora - (3 meses - 2 días) = ahora - 88 días
  CURRENT_DATE - INTERVAL '88 days',
  true,
  3,
  'months',
  'Documento de prueba - Renovación PERSONALIZADA 3 meses, vence en 2 días'
FROM employees
WHERE NOT EXISTS (
  SELECT 1 FROM employee_document_requirements
  WHERE notes LIKE '%Renovación PERSONALIZADA%'
)
ORDER BY RANDOM()
LIMIT 1;

-- Paso 3: Verificar los documentos insertados
SELECT
  '=== DOCUMENTOS DE PRUEBA INSERTADOS ===' as info;

SELECT
  edr.id,
  edr.employee_id,
  edr.document_type,
  edr.status,
  edr.approved_at::DATE as fecha_aprobacion,
  dt.renewal_period as periodo_renovacion,
  dt.renewal_unit as unidad,
  edr.has_custom_renewal,
  edr.custom_renewal_period,
  edr.custom_renewal_unit,
  -- Calcular días hasta vencimiento
  CASE
    WHEN edr.has_custom_renewal THEN
      CASE
        WHEN edr.custom_renewal_unit = 'months' THEN
          EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' months')::INTERVAL - CURRENT_DATE))::INTEGER
        WHEN edr.custom_renewal_unit = 'years' THEN
          EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' years')::INTERVAL - CURRENT_DATE))::INTEGER
        WHEN edr.custom_renewal_unit = 'days' THEN
          EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' days')::INTERVAL - CURRENT_DATE))::INTEGER
      END
    ELSE
      CASE
        WHEN dt.renewal_unit = 'months' THEN
          EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' months')::INTERVAL - CURRENT_DATE))::INTEGER
        WHEN dt.renewal_unit = 'years' THEN
          EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' years')::INTERVAL - CURRENT_DATE))::INTEGER
        WHEN dt.renewal_unit = 'days' THEN
          EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' days')::INTERVAL - CURRENT_DATE))::INTEGER
      END
  END as dias_hasta_vencimiento,
  edr.notes
FROM employee_document_requirements edr
LEFT JOIN document_types dt ON dt.name = edr.document_type
WHERE edr.status = 'approved'
  AND edr.approved_at IS NOT NULL
  AND edr.notes LIKE '%Documento de prueba%'
ORDER BY dias_hasta_vencimiento;

-- Mostrar resumen
SELECT
  '=== RESUMEN ===' as info;

SELECT
  CASE
    WHEN dias <= 7 THEN '🔴 URGENTE (≤7 días)'
    WHEN dias <= 15 THEN '🟠 ALTA (7-15 días)'
    WHEN dias <= 30 THEN '🟡 MEDIA (15-30 días)'
    ELSE '⚫ VENCIDO'
  END as categoria,
  COUNT(*) as cantidad
FROM (
  SELECT
    CASE
      WHEN edr.has_custom_renewal THEN
        CASE
          WHEN edr.custom_renewal_unit = 'months' THEN
            EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' months')::INTERVAL - CURRENT_DATE))::INTEGER
          WHEN edr.custom_renewal_unit = 'years' THEN
            EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' years')::INTERVAL - CURRENT_DATE))::INTEGER
        END
      ELSE
        CASE
          WHEN dt.renewal_unit = 'months' THEN
            EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' months')::INTERVAL - CURRENT_DATE))::INTEGER
          WHEN dt.renewal_unit = 'years' THEN
            EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' years')::INTERVAL - CURRENT_DATE))::INTEGER
        END
    END as dias
  FROM employee_document_requirements edr
  LEFT JOIN document_types dt ON dt.name = edr.document_type
  WHERE edr.status = 'approved'
    AND edr.approved_at IS NOT NULL
    AND edr.notes LIKE '%Documento de prueba%'
) subquery
GROUP BY categoria
ORDER BY
  CASE categoria
    WHEN '⚫ VENCIDO' THEN 1
    WHEN '🔴 URGENTE (≤7 días)' THEN 2
    WHEN '🟠 ALTA (7-15 días)' THEN 3
    WHEN '🟡 MEDIA (15-30 días)' THEN 4
  END;
