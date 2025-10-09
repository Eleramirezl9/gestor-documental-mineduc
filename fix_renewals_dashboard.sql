-- ========================================
-- FIX: Documents not appearing in Renewals Dashboard
-- ========================================
--
-- PROBLEM: Documents showing as "Vencido" in employees page are NOT appearing in renewals dashboard
--
-- ROOT CAUSES:
-- 1. Documents have status='pending' and approved_at=NULL (renewal service requires status='approved' and approved_at IS NOT NULL)
-- 2. Document types have has_expiration=false (even though documents have custom renewal enabled)
--
-- AFFECTED DOCUMENTS:
-- - PPPPPP (has custom renewal: 11 months)
-- - Partida de Nacimiento (has custom renewal: 2 months)
-- ========================================

-- Step 1: Update document types to enable expiration
-- This allows the renewal service to consider them for expiration calculations
UPDATE document_types
SET
  has_expiration = true,
  renewal_period = 12,
  renewal_unit = 'months'
WHERE name IN ('PPPPPP', 'Partida de Nacimiento')
  AND has_expiration = false;

-- Step 2: Approve the pending documents and set approval date
-- The renewal service calculates expiration from approved_at + renewal_period
-- Setting approved_at to match the employee page's logic (required_date - custom_renewal_period)

-- For PPPPPP: Required date is 2025-10-01, custom renewal is 11 months
-- So approved_at should be: 2025-10-01 - 11 months = 2024-11-01
UPDATE employee_document_requirements
SET
  status = 'approved',
  approved_at = (required_date - (custom_renewal_period || ' ' || custom_renewal_unit)::interval)::date
WHERE document_type = 'PPPPPP'
  AND description = 'WW'
  AND status = 'pending'
  AND has_custom_renewal = true;

-- For Partida de Nacimiento: Required date is 2025-11-05, custom renewal is 2 months
-- So approved_at should be: 2025-11-05 - 2 months = 2025-09-05
UPDATE employee_document_requirements
SET
  status = 'approved',
  approved_at = (required_date - (custom_renewal_period || ' ' || custom_renewal_unit)::interval)::date
WHERE document_type = 'Partida de Nacimiento'
  AND description = 'DED'
  AND status = 'pending'
  AND has_custom_renewal = true;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify document types now have expiration enabled
SELECT name, has_expiration, renewal_period, renewal_unit
FROM document_types
WHERE name IN ('PPPPPP', 'Partida de Nacimiento');

-- Verify documents now have approved status and approved_at date
SELECT
  id,
  document_type,
  description,
  status,
  approved_at,
  required_date,
  has_custom_renewal,
  custom_renewal_period,
  custom_renewal_unit,
  -- Calculate expiration date (approved_at + custom_renewal_period)
  (approved_at + (custom_renewal_period || ' ' || custom_renewal_unit)::interval)::date as calculated_expiration_date,
  -- Calculate days until expiration
  EXTRACT(DAY FROM (approved_at + (custom_renewal_period || ' ' || custom_renewal_unit)::interval)::date - CURRENT_DATE) as days_until_expiration
FROM employee_document_requirements
WHERE document_type IN ('PPPPPP', 'Partida de Nacimiento')
  AND description IN ('WW', 'DED');

-- Test the renewal service query (simulating what the backend does)
SELECT
  edr.*,
  dt.has_expiration,
  dt.renewal_period as dt_renewal_period,
  dt.renewal_unit as dt_renewal_unit,
  -- Calculate expiration using custom renewal if available
  CASE
    WHEN edr.has_custom_renewal THEN
      (edr.approved_at + (edr.custom_renewal_period || ' ' || edr.custom_renewal_unit)::interval)::date
    ELSE
      (edr.approved_at + (dt.renewal_period || ' ' || dt.renewal_unit)::interval)::date
  END as expiration_date,
  -- Days until expiration
  CASE
    WHEN edr.has_custom_renewal THEN
      EXTRACT(DAY FROM (edr.approved_at + (edr.custom_renewal_period || ' ' || edr.custom_renewal_unit)::interval)::date - CURRENT_DATE)
    ELSE
      EXTRACT(DAY FROM (edr.approved_at + (dt.renewal_period || ' ' || dt.renewal_unit)::interval)::date - CURRENT_DATE)
  END as days_until_expiration
FROM employee_document_requirements edr
JOIN document_types dt ON dt.name = edr.document_type
WHERE edr.status = 'approved'
  AND edr.approved_at IS NOT NULL
  AND (dt.has_expiration = true OR edr.has_custom_renewal = true)
  AND edr.document_type IN ('PPPPPP', 'Partida de Nacimiento')
ORDER BY expiration_date;
