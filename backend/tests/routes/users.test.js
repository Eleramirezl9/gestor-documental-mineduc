const request = require('supertest');
const express = require('express');

// Mock Supabase before importing the router
jest.mock('../../config/supabase', () => require('../mocks/supabase.mock'));

const usersRouter = require('../../routes/users');

describe('Users API', () => {
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

    app.use('/api/users', usersRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/enhanced', () => {
    it('should return enhanced user list for admin', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('total');
      expect(response.body.users).toBeInstanceOf(Array);
      expect(response.body.users.length).toBeGreaterThan(0);

      // Validate user structure
      const firstUser = response.body.users[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('first_name');
      expect(firstUser).toHaveProperty('last_name');
      expect(firstUser).toHaveProperty('role');
      expect(firstUser).toHaveProperty('employee_id');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .query({ limit: 2, page: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .query({ search: 'admin' })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body.users.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by role', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .query({ role: 'admin' })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      response.body.users.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });

    it('should filter by department', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .query({ department: 'TI' })
        .expect(200);

      expect(response.body).toHaveProperty('users');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/users/enhanced')
        .query({ status: 'active' })
        .expect(200);

      expect(response.body).toHaveProperty('users');
      response.body.users.forEach(user => {
        expect(user.is_active).toBe(true);
      });
    });
  });

  describe('GET /api/users/enhanced/:id', () => {
    it('should return specific user details', async () => {
      const response = await request(app)
        .get('/api/users/enhanced/user-1')
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id', 'user-1');
      expect(response.body.user).toHaveProperty('email', 'admin@mineduc.gob.gt');
      expect(response.body.user).toHaveProperty('documents');
      expect(response.body.user).toHaveProperty('last_activity');
      expect(response.body.user.documents).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/users/enhanced/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Usuario no encontrado');
    });
  });

  describe('POST /api/users/enhanced', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        email: 'nuevo.usuario@mineduc.gob.gt',
        first_name: 'Nuevo',
        last_name: 'Usuario',
        role: 'viewer',
        department: 'Pruebas',
        phone: '+502 2411-9999',
        position: 'Tester'
      };

      const response = await request(app)
        .post('/api/users/enhanced')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', newUser.email);
      expect(response.body.user).toHaveProperty('first_name', newUser.first_name);
      expect(response.body).toHaveProperty('message');
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        first_name: 'Test'
        // Missing email, last_name, role, department
      };

      const response = await request(app)
        .post('/api/users/enhanced')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const invalidUser = {
        email: 'invalid-email',
        first_name: 'Test',
        last_name: 'User',
        role: 'viewer',
        department: 'Test'
      };

      const response = await request(app)
        .post('/api/users/enhanced')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors.some(error =>
        error.msg && error.msg.includes('email')
      )).toBe(true);
    });

    it('should validate role values', async () => {
      const invalidUser = {
        email: 'test@mineduc.gob.gt',
        first_name: 'Test',
        last_name: 'User',
        role: 'invalid_role',
        department: 'Test'
      };

      const response = await request(app)
        .post('/api/users/enhanced')
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/users/enhanced/:id', () => {
    it('should update user with valid data', async () => {
      const updateData = {
        first_name: 'Nombre Actualizado',
        last_name: 'Apellido Actualizado',
        department: 'Nuevo Departamento',
        phone: '+502 9999-9999'
      };

      const response = await request(app)
        .put('/api/users/enhanced/user-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('actualizado');
    });

    it('should handle non-existent user update', async () => {
      const updateData = {
        first_name: 'Test'
      };

      const response = await request(app)
        .put('/api/users/enhanced/non-existent')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate update data', async () => {
      const invalidData = {
        role: 'invalid_role'
      };

      const response = await request(app)
        .put('/api/users/enhanced/user-1')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/users/enhanced/:id/deactivate', () => {
    it('should deactivate user successfully', async () => {
      const response = await request(app)
        .post('/api/users/enhanced/user-2/deactivate')
        .send({ reason: 'Test deactivation' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('desactivado');
    });

    it('should require deactivation reason', async () => {
      const response = await request(app)
        .post('/api/users/enhanced/user-2/deactivate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle non-existent user deactivation', async () => {
      const response = await request(app)
        .post('/api/users/enhanced/non-existent/deactivate')
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/enhanced/:id/activate', () => {
    it('should activate user successfully', async () => {
      const response = await request(app)
        .post('/api/users/enhanced/user-2/activate')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('activado');
    });

    it('should handle non-existent user activation', async () => {
      const response = await request(app)
        .post('/api/users/enhanced/non-existent/activate')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/enhanced/stats/overview', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/users/enhanced/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('total_users');
      expect(response.body).toHaveProperty('active_users');
      expect(response.body).toHaveProperty('inactive_users');
      expect(response.body).toHaveProperty('by_role');
      expect(response.body).toHaveProperty('by_department');
      expect(response.body).toHaveProperty('recent_registrations');
      expect(response.body).toHaveProperty('recent_activity');

      expect(typeof response.body.total_users).toBe('number');
      expect(typeof response.body.active_users).toBe('number');
      expect(typeof response.body.inactive_users).toBe('number');
      expect(response.body.by_role).toBeInstanceOf(Object);
      expect(response.body.by_department).toBeInstanceOf(Object);
      expect(response.body.recent_registrations).toBeInstanceOf(Array);
      expect(response.body.recent_activity).toBeInstanceOf(Array);
    });
  });
});