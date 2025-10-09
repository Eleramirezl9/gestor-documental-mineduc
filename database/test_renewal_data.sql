-- Script para crear datos de prueba del sistema de renovaciones
-- Este script crea tipos de documentos con renovación y asignaciones aprobadas

-- 1. Crear tipos de documento con renovación
INSERT INTO document_types (name, category, description, required, is_active, has_expiration, renewal_period, renewal_unit)
VALUES
  ('Certificado Médico', 'Salud', 'Certificado médico para trabajo', true, true, true, 6, 'months'),
  ('Licencia de Conducir', 'Legal', 'Licencia vigente', true, true, true, 1, 'years'),
  ('Seguro de Vida', 'Seguros', 'Póliza de seguro', false, true, true, 12, 'months')
ON CONFLICT (name) DO NOTHING;

-- 2. Verificar que exista al menos un empleado (ajusta el UUID si es necesario)
-- Si no hay empleados, primero necesitas crear uno en la tabla employees

-- 3. Crear asignaciones de documentos APROBADOS con fechas de aprobación
-- Nota: Ajusta los employee_id según los empleados que tengas en tu base de datos

-- Documento que vence en 5 días (URGENTE)
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at
)
SELECT
  id,
  'Certificado Médico',
  'Certificado médico de prueba',
  CURRENT_DATE + INTERVAL '10 days',
  'approved',
  'high',
  CURRENT_DATE - INTERVAL '175 days'  -- Aprobado hace 175 días (vence en 5 días si renovación es 6 meses)
FROM employees
LIMIT 1
ON CONFLICT DO NOTHING;

-- Documento que vence en 10 días (ALTA PRIORIDAD)
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at
)
SELECT
  id,
  'Licencia de Conducir',
  'Licencia de conducir de prueba',
  CURRENT_DATE + INTERVAL '15 days',
  'approved',
  'medium',
  CURRENT_DATE - INTERVAL '355 days'  -- Aprobado hace 355 días (vence en 10 días si renovación es 1 año)
FROM employees
ORDER BY RANDOM()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Documento que vence en 25 días (PRIORIDAD MEDIA)
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at
)
SELECT
  id,
  'Seguro de Vida',
  'Póliza de seguro de prueba',
  CURRENT_DATE + INTERVAL '30 days',
  'approved',
  'normal',
  CURRENT_DATE - INTERVAL '340 days'  -- Aprobado hace 340 días (vence en 25 días si renovación es 12 meses)
FROM employees
ORDER BY RANDOM()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Documento YA VENCIDO
INSERT INTO employee_document_requirements (
  employee_id,
  document_type,
  description,
  required_date,
  status,
  priority,
  approved_at
)
SELECT
  id,
  'Certificado Médico',
  'Certificado médico vencido',
  CURRENT_DATE - INTERVAL '5 days',
  'approved',
  'urgent',
  CURRENT_DATE - INTERVAL '190 days'  -- Aprobado hace 190 días (ya venció hace 10 días)
FROM employees
ORDER BY RANDOM()
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verificar los datos insertados
SELECT
  edr.id,
  edr.employee_id,
  edr.document_type,
  edr.status,
  edr.approved_at,
  dt.has_expiration,
  dt.renewal_period,
  dt.renewal_unit,
  -- Calcular días hasta vencimiento
  CASE
    WHEN dt.renewal_unit = 'months' THEN
      EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' months')::INTERVAL - CURRENT_DATE))
    WHEN dt.renewal_unit = 'years' THEN
      EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' years')::INTERVAL - CURRENT_DATE))
    WHEN dt.renewal_unit = 'days' THEN
      EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' days')::INTERVAL - CURRENT_DATE))
  END as days_until_expiration
FROM employee_document_requirements edr
LEFT JOIN document_types dt ON dt.name = edr.document_type
WHERE edr.status = 'approved'
  AND edr.approved_at IS NOT NULL
  AND dt.has_expiration = true
ORDER BY days_until_expiration;
