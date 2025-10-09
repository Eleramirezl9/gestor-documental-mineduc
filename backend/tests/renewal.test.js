/**
 * Tests para el sistema de renovación de documentos
 */

const request = require('supertest');
const app = require('../server');

describe('Sistema de Renovación de Documentos', () => {
  let authToken;
  let employeeId;
  let documentTypeId;
  let assignmentId;

  beforeAll(async () => {
    // Aquí deberías obtener un token válido de autenticación
    // Por ahora, asumimos que existe
  });

  describe('1. Crear tipo de documento con renovación', () => {
    test('Debe crear tipo de documento con has_expiration=true', async () => {
      const newDocType = {
        name: 'Test Certificado Médico',
        category: 'Salud',
        description: 'Documento de prueba',
        requirement_type: 'required',
        has_renewal: true,
        renewal_period: 6,
        renewal_unit: 'months'
      };

      const response = await request(app)
        .post('/api/employee-document-requirements/document-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newDocType);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.has_expiration).toBe(true);
      expect(response.body.data.renewal_period).toBe(6);
      expect(response.body.data.renewal_unit).toBe('months');

      documentTypeId = response.body.data.id;
    });
  });

  describe('2. Asignar documento con renovación', () => {
    test('Debe asignar documento y heredar renovación del tipo', async () => {
      const assignment = {
        employee_id: 'MIN25007',
        documents: [{
          document_type_id: documentTypeId,
          priority: 'normal',
          due_date: '2025-12-01'
        }]
      };

      const response = await request(app)
        .post('/api/employee-document-requirements/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send(assignment);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      assignmentId = response.body.data[0].id;
    });
  });

  describe('3. Actualizar con renovación personalizada', () => {
    test('Debe actualizar documento con renovación personalizada', async () => {
      const update = {
        priority: 'urgente',
        hasCustomRenewal: true,
        customRenewalPeriod: 3,
        customRenewalUnit: 'months'
      };

      const response = await request(app)
        .put(`/api/employee-document-requirements/${assignmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.has_custom_renewal).toBe(true);
      expect(response.body.data.custom_renewal_period).toBe(3);
      expect(response.body.data.custom_renewal_unit).toBe('months');
    });
  });

  describe('4. Validaciones de renovación', () => {
    test('Debe rechazar renovación con período inválido', async () => {
      const update = {
        hasCustomRenewal: true,
        customRenewalPeriod: -5, // Inválido
        customRenewalUnit: 'months'
      };

      const response = await request(app)
        .put(`/api/employee-document-requirements/${assignmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update);

      expect(response.status).toBe(400);
    });

    test('Debe rechazar renovación con unidad inválida', async () => {
      const update = {
        hasCustomRenewal: true,
        customRenewalPeriod: 3,
        customRenewalUnit: 'invalid_unit' // Inválido
      };

      const response = await request(app)
        .put(`/api/employee-document-requirements/${assignmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update);

      expect(response.status).toBe(400);
    });

    test('Debe permitir desactivar renovación personalizada', async () => {
      const update = {
        hasCustomRenewal: false,
        customRenewalPeriod: null,
        customRenewalUnit: null
      };

      const response = await request(app)
        .put(`/api/employee-document-requirements/${assignmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(update);

      expect(response.status).toBe(200);
      expect(response.body.data.has_custom_renewal).toBe(false);
      expect(response.body.data.custom_renewal_period).toBeNull();
      expect(response.body.data.custom_renewal_unit).toBeNull();
    });
  });

  describe('5. Consultar documentos con renovación', () => {
    test('Debe devolver documentos con campos de renovación', async () => {
      const response = await request(app)
        .get('/api/employee-document-requirements/employee/MIN25007')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verificar que los documentos tienen campos de renovación
      const doc = response.body.data.find(d => d.id === assignmentId);
      expect(doc).toBeDefined();
      expect(doc).toHaveProperty('has_custom_renewal');
      expect(doc).toHaveProperty('custom_renewal_period');
      expect(doc).toHaveProperty('custom_renewal_unit');
    });
  });
});

describe('Cálculo de Documentos Próximos a Vencer', () => {
  describe('calculateExpirationDate', () => {
    test('Debe calcular fecha de vencimiento basado en renovación en meses', () => {
      const uploadDate = new Date('2025-01-01');
      const documentType = {
        has_expiration: true,
        renewal_period: 6,
        renewal_unit: 'months'
      };

      const expirationDate = calculateExpirationDate(uploadDate, documentType);

      expect(expirationDate).toBeDefined();
      expect(expirationDate.getMonth()).toBe(6); // Julio (mes 6)
      expect(expirationDate.getFullYear()).toBe(2025);
    });

    test('Debe calcular fecha de vencimiento basado en renovación en días', () => {
      const uploadDate = new Date('2025-01-01');
      const documentType = {
        has_expiration: true,
        renewal_period: 30,
        renewal_unit: 'days'
      };

      const expirationDate = calculateExpirationDate(uploadDate, documentType);

      expect(expirationDate).toBeDefined();
      expect(expirationDate.getDate()).toBe(31); // 30 días después
      expect(expirationDate.getMonth()).toBe(0); // Enero
    });

    test('Debe calcular fecha de vencimiento basado en renovación en años', () => {
      const uploadDate = new Date('2025-01-01');
      const documentType = {
        has_expiration: true,
        renewal_period: 2,
        renewal_unit: 'years'
      };

      const expirationDate = calculateExpirationDate(uploadDate, documentType);

      expect(expirationDate).toBeDefined();
      expect(expirationDate.getFullYear()).toBe(2027);
    });

    test('Debe retornar null si no hay renovación', () => {
      const uploadDate = new Date('2025-01-01');
      const documentType = {
        has_expiration: false,
        renewal_period: null,
        renewal_unit: null
      };

      const expirationDate = calculateExpirationDate(uploadDate, documentType);

      expect(expirationDate).toBeNull();
    });
  });

  describe('getDocumentsExpiringIn', () => {
    test('Debe identificar documentos que vencen en 30 días', () => {
      // Este test requeriría mock de la base de datos
      // o datos de prueba específicos
    });

    test('Debe identificar documentos que vencen en 15 días', () => {
      // Test de integración con datos de prueba
    });

    test('Debe identificar documentos que vencen en 7 días', () => {
      // Test de integración con datos de prueba
    });
  });
});

// Función helper para cálculo de fecha de vencimiento
function calculateExpirationDate(uploadDate, documentType) {
  if (!documentType.has_expiration || !documentType.renewal_period) {
    return null;
  }

  const date = new Date(uploadDate);
  const period = documentType.renewal_period;
  const unit = documentType.renewal_unit || 'months';

  if (unit === 'months') {
    date.setMonth(date.getMonth() + period);
  } else if (unit === 'years') {
    date.setFullYear(date.getFullYear() + period);
  } else if (unit === 'days') {
    date.setDate(date.getDate() + period);
  }

  return date;
}
