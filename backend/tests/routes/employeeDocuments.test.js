const request = require('supertest');
const express = require('express');

// Mock Supabase before importing the router
jest.mock('../../config/supabase', () => require('../mocks/supabase.mock'));

const employeeDocumentsRouter = require('../../routes/employeeDocuments');

describe('Employee Documents API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'user-1',
        email: 'admin@mineduc.gob.gt',
        role: 'admin'
      };
      next();
    });

    app.use('/api/employee-documents', employeeDocumentsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/employee-documents/employees/test', () => {
    it('should return employees with document status', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');

      expect(response.body.employees).toBeInstanceOf(Array);
      expect(response.body.employees.length).toBeGreaterThan(0);

      // Validate employee structure
      const firstEmployee = response.body.employees[0];
      expect(firstEmployee).toHaveProperty('id');
      expect(firstEmployee).toHaveProperty('email');
      expect(firstEmployee).toHaveProperty('first_name');
      expect(firstEmployee).toHaveProperty('last_name');
      expect(firstEmployee).toHaveProperty('department');
      expect(firstEmployee).toHaveProperty('employee_id');
      expect(firstEmployee).toHaveProperty('documents');
      expect(firstEmployee).toHaveProperty('document_status');
      expect(firstEmployee).toHaveProperty('requirement_status');
      expect(firstEmployee).toHaveProperty('overall_status');

      // Validate document status structure
      expect(firstEmployee.document_status).toHaveProperty('total');
      expect(firstEmployee.document_status).toHaveProperty('active');
      expect(firstEmployee.document_status).toHaveProperty('expired');
      expect(firstEmployee.document_status).toHaveProperty('expiring_soon');
      expect(firstEmployee.document_status).toHaveProperty('pending');

      // Validate requirement status structure
      expect(firstEmployee.requirement_status).toHaveProperty('total');
      expect(firstEmployee.requirement_status).toHaveProperty('pending');
      expect(firstEmployee.requirement_status).toHaveProperty('overdue');
      expect(firstEmployee.requirement_status).toHaveProperty('completed');

      // Validate overall status values
      expect(['critical', 'attention', 'normal', 'complete']).toContain(firstEmployee.overall_status);
    });

    it('should support department filtering', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .query({ department: 'Recursos Humanos' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');

      response.body.employees.forEach(employee => {
        expect(employee.department).toBe('Recursos Humanos');
      });
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .query({ status: 'critical' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .query({ search: 'ana' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');
    });

    it('should support expiring_soon filtering', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .query({ expiring_soon: true })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/employee-documents/employees/test')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('limit', 2);
      expect(response.body.employees.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/employee-documents/expiring/test', () => {
    it('should return expiring documents', async () => {
      const response = await request(app)
        .get('/api/employee-documents/expiring/test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('documents');
      expect(response.body).toHaveProperty('total');

      expect(response.body.documents).toBeInstanceOf(Array);

      // If there are documents, validate their structure
      if (response.body.documents.length > 0) {
        const firstDoc = response.body.documents[0];
        expect(firstDoc).toHaveProperty('id');
        expect(firstDoc).toHaveProperty('title');
        expect(firstDoc).toHaveProperty('status');
        expect(firstDoc).toHaveProperty('expiration_date');
        expect(firstDoc).toHaveProperty('user');
        expect(firstDoc).toHaveProperty('category');
        expect(firstDoc).toHaveProperty('days_until_expiration');
        expect(firstDoc).toHaveProperty('urgency');

        // Validate user structure
        expect(firstDoc.user).toHaveProperty('id');
        expect(firstDoc.user).toHaveProperty('first_name');
        expect(firstDoc.user).toHaveProperty('last_name');
        expect(firstDoc.user).toHaveProperty('email');
        expect(firstDoc.user).toHaveProperty('department');

        // Validate urgency levels
        expect(['urgent', 'high', 'medium']).toContain(firstDoc.urgency);
      }
    });

    it('should support days parameter', async () => {
      const response = await request(app)
        .get('/api/employee-documents/expiring/test')
        .query({ days: 7 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('documents');
    });

    it('should default to 30 days if no parameter provided', async () => {
      const response = await request(app)
        .get('/api/employee-documents/expiring/test')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('documents');
    });
  });

  describe('POST /api/employee-documents/register', () => {
    it('should register new employee with valid data', async () => {
      const newEmployee = {
        email: 'nuevo.empleado@mineduc.gob.gt',
        first_name: 'Nuevo',
        last_name: 'Empleado',
        department: 'Recursos Humanos',
        phone: '+502 2411-9999',
        employee_id: 'MIN25999',
        position: 'Especialista',
        hire_date: '2024-01-01',
        required_documents: [
          {
            type: 'DPI',
            required_date: '2024-02-01',
            description: 'Documento de identidad personal'
          }
        ]
      };

      const response = await request(app)
        .post('/api/employee-documents/register')
        .send(newEmployee)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employee');
      expect(response.body).toHaveProperty('message');
      expect(response.body.employee).toHaveProperty('email', newEmployee.email);
      expect(response.body.employee).toHaveProperty('first_name', newEmployee.first_name);
    });

    it('should validate required fields', async () => {
      const invalidEmployee = {
        first_name: 'Test'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/employee-documents/register')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const invalidEmployee = {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: 'User',
        department: 'Test'
      };

      const response = await request(app)
        .post('/api/employee-documents/register')
        .send(invalidEmployee)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle employee registration without required documents', async () => {
      const newEmployee = {
        email: 'simple.empleado@mineduc.gob.gt',
        first_name: 'Simple',
        last_name: 'Empleado',
        department: 'TI',
        phone: '+502 2411-8888',
        position: 'Developer'
      };

      const response = await request(app)
        .post('/api/employee-documents/register')
        .send(newEmployee)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('employee');
    });
  });

  describe('PUT /api/employee-documents/document/:id/status', () => {
    it('should update document status with valid data', async () => {
      const updateData = {
        status: 'approved',
        comments: 'Documento revisado y aprobado'
      };

      const response = await request(app)
        .put('/api/employee-documents/document/doc-1/status')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('approved');
    });

    it('should validate status values', async () => {
      const invalidData = {
        status: 'invalid_status'
      };

      const response = await request(app)
        .put('/api/employee-documents/document/doc-1/status')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should require status field', async () => {
      const response = await request(app)
        .put('/api/employee-documents/document/doc-1/status')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/employee-documents/report', () => {
    it('should generate document status report for admin', async () => {
      const response = await request(app)
        .get('/api/employee-documents/report')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('report');

      const report = response.body.report;
      expect(report).toHaveProperty('generated_at');
      expect(report).toHaveProperty('filters');
      expect(report).toHaveProperty('statistics');
      expect(report).toHaveProperty('employees');
      expect(report).toHaveProperty('expiring_documents');
      expect(report).toHaveProperty('summary');

      // Validate statistics structure
      expect(report.statistics).toHaveProperty('total_employees');
      expect(report.statistics).toHaveProperty('employees_by_status');
      expect(report.statistics).toHaveProperty('documents');
      expect(report.statistics).toHaveProperty('departments');

      // Validate summary structure
      expect(report.summary).toHaveProperty('total_employees');
      expect(report.summary).toHaveProperty('critical_attention_needed');
      expect(report.summary).toHaveProperty('documents_expiring_soon');
      expect(report.summary).toHaveProperty('documents_expired');
    });

    it('should support department filtering', async () => {
      const response = await request(app)
        .get('/api/employee-documents/report')
        .query({ department: 'TI' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.report.filters).toHaveProperty('department', 'TI');
    });

    it('should support date filtering', async () => {
      const response = await request(app)
        .get('/api/employee-documents/report')
        .query({
          date_from: '2024-01-01',
          date_to: '2024-12-31'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.report.filters).toHaveProperty('date_from', '2024-01-01');
      expect(response.body.report.filters).toHaveProperty('date_to', '2024-12-31');
    });
  });

  describe('GET /api/employee-documents/departments', () => {
    it('should return list of departments', async () => {
      const response = await request(app)
        .get('/api/employee-documents/departments')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('departments');
      expect(response.body.departments).toBeInstanceOf(Array);
      expect(response.body.departments.length).toBeGreaterThan(0);

      // Should be sorted
      const departments = response.body.departments;
      const sortedDepartments = [...departments].sort();
      expect(departments).toEqual(sortedDepartments);
    });
  });

  describe('POST /api/employee-documents/process-notifications', () => {
    it('should process expiration notifications for admin', async () => {
      const response = await request(app)
        .post('/api/employee-documents/process-notifications')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('notifications_created');
      expect(typeof response.body.notifications_created).toBe('number');
    });
  });
});