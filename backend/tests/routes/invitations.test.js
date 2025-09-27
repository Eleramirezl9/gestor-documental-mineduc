const request = require('supertest');
const express = require('express');

// Mock Supabase before importing the router
jest.mock('../../config/supabase', () => require('../mocks/supabase.mock'));

const invitationsRouter = require('../../routes/invitations');

describe('Invitations API', () => {
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

    app.use('/api/invitations', invitationsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/invitations', () => {
    it('should return list of invitations for admin', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitations');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');

      expect(response.body.invitations).toBeInstanceOf(Array);

      if (response.body.invitations.length > 0) {
        const firstInvitation = response.body.invitations[0];
        expect(firstInvitation).toHaveProperty('id');
        expect(firstInvitation).toHaveProperty('email');
        expect(firstInvitation).toHaveProperty('role');
        expect(firstInvitation).toHaveProperty('status');
        expect(firstInvitation).toHaveProperty('created_at');
        expect(firstInvitation).toHaveProperty('expires_at');

        // Validate status values
        expect(['pending', 'accepted', 'expired', 'revoked']).toContain(firstInvitation.status);

        // Validate role values
        expect(['admin', 'editor', 'viewer']).toContain(firstInvitation.role);
      }
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 5);
      expect(response.body.invitations.length).toBeLessThanOrEqual(5);
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .query({ status: 'pending' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.invitations.forEach(invitation => {
        expect(invitation.status).toBe('pending');
      });
    });

    it('should support role filtering', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .query({ role: 'viewer' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      response.body.invitations.forEach(invitation => {
        expect(invitation.role).toBe('viewer');
      });
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/invitations')
        .query({ search: 'nuevo' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitations');
    });
  });

  describe('POST /api/invitations', () => {
    it('should create invitation with valid data', async () => {
      const invitationData = {
        email: 'test.invitation@mineduc.gob.gt',
        role: 'viewer',
        department: 'TI',
        message: 'Bienvenido al sistema MINEDUC'
      };

      const response = await request(app)
        .post('/api/invitations')
        .send(invitationData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('message');

      expect(response.body.invitation).toHaveProperty('email', invitationData.email);
      expect(response.body.invitation).toHaveProperty('role', invitationData.role);
      expect(response.body.invitation).toHaveProperty('status', 'pending');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing email and role
        department: 'TI'
      };

      const response = await request(app)
        .post('/api/invitations')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email-format',
        role: 'viewer'
      };

      const response = await request(app)
        .post('/api/invitations')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should validate role values', async () => {
      const invalidData = {
        email: 'test@mineduc.gob.gt',
        role: 'invalid_role'
      };

      const response = await request(app)
        .post('/api/invitations')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle duplicate email invitations', async () => {
      const invitationData = {
        email: 'existing@mineduc.gob.gt',
        role: 'viewer'
      };

      // First invitation should succeed
      await request(app)
        .post('/api/invitations')
        .send(invitationData)
        .expect(201);

      // Second invitation with same email might fail or update existing
      const response = await request(app)
        .post('/api/invitations')
        .send(invitationData);

      expect([200, 201, 400, 409]).toContain(response.status);
    });

    it('should set default expiration date', async () => {
      const invitationData = {
        email: 'expiry.test@mineduc.gob.gt',
        role: 'viewer'
      };

      const response = await request(app)
        .post('/api/invitations')
        .send(invitationData)
        .expect(201);

      expect(response.body.invitation).toHaveProperty('expires_at');

      const expiryDate = new Date(response.body.invitation.expires_at);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(expiryDate.getTime()).toBeGreaterThan(now.getTime());
      expect(expiryDate.getTime()).toBeLessThanOrEqual(sevenDaysFromNow.getTime());
    });
  });

  describe('GET /api/invitations/:id', () => {
    it('should return specific invitation details', async () => {
      const response = await request(app)
        .get('/api/invitations/inv-1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitation');

      const invitation = response.body.invitation;
      expect(invitation).toHaveProperty('id', 'inv-1');
      expect(invitation).toHaveProperty('email');
      expect(invitation).toHaveProperty('role');
      expect(invitation).toHaveProperty('status');
      expect(invitation).toHaveProperty('created_at');
      expect(invitation).toHaveProperty('expires_at');
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await request(app)
        .get('/api/invitations/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('no encontrada');
    });
  });

  describe('PUT /api/invitations/:id', () => {
    it('should update invitation with valid data', async () => {
      const updateData = {
        role: 'editor',
        message: 'Rol actualizado a editor'
      };

      const response = await request(app)
        .put('/api/invitations/inv-1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('invitation');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('actualizada');
    });

    it('should validate role values in updates', async () => {
      const invalidUpdate = {
        role: 'invalid_role'
      };

      const response = await request(app)
        .put('/api/invitations/inv-1')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should handle non-existent invitation updates', async () => {
      const updateData = {
        role: 'editor'
      };

      const response = await request(app)
        .put('/api/invitations/non-existent')
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/invitations/:id', () => {
    it('should revoke invitation successfully', async () => {
      const response = await request(app)
        .delete('/api/invitations/inv-1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('revocada');
    });

    it('should handle non-existent invitation deletion', async () => {
      const response = await request(app)
        .delete('/api/invitations/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/invitations/:id/resend', () => {
    it('should resend invitation successfully', async () => {
      const response = await request(app)
        .post('/api/invitations/inv-1/resend')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('reenviada');
    });

    it('should handle non-existent invitation resend', async () => {
      const response = await request(app)
        .post('/api/invitations/non-existent/resend')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/invitations/stats/overview', () => {
    it('should return invitation statistics', async () => {
      const response = await request(app)
        .get('/api/invitations/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('total_invitations');
      expect(response.body).toHaveProperty('pending_invitations');
      expect(response.body).toHaveProperty('accepted_invitations');
      expect(response.body).toHaveProperty('expired_invitations');
      expect(response.body).toHaveProperty('revoked_invitations');
      expect(response.body).toHaveProperty('by_role');
      expect(response.body).toHaveProperty('by_department');
      expect(response.body).toHaveProperty('recent_invitations');
      expect(response.body).toHaveProperty('acceptance_rate');

      // Validate data types
      expect(typeof response.body.total_invitations).toBe('number');
      expect(typeof response.body.pending_invitations).toBe('number');
      expect(typeof response.body.accepted_invitations).toBe('number');
      expect(typeof response.body.expired_invitations).toBe('number');
      expect(typeof response.body.revoked_invitations).toBe('number');
      expect(typeof response.body.acceptance_rate).toBe('number');

      expect(response.body.by_role).toBeInstanceOf(Object);
      expect(response.body.by_department).toBeInstanceOf(Object);
      expect(response.body.recent_invitations).toBeInstanceOf(Array);

      // Validate acceptance rate
      expect(response.body.acceptance_rate).toBeGreaterThanOrEqual(0);
      expect(response.body.acceptance_rate).toBeLessThanOrEqual(1);
    });

    it('should have consistent totals', async () => {
      const response = await request(app)
        .get('/api/invitations/stats/overview')
        .expect(200);

      const calculatedTotal = response.body.pending_invitations +
                            response.body.accepted_invitations +
                            response.body.expired_invitations +
                            response.body.revoked_invitations;

      expect(calculatedTotal).toBeLessThanOrEqual(response.body.total_invitations);
    });
  });

  describe('Bulk Operations', () => {
    it('should support bulk invitation creation', async () => {
      const bulkData = {
        invitations: [
          {
            email: 'bulk1@mineduc.gob.gt',
            role: 'viewer',
            department: 'Recursos Humanos'
          },
          {
            email: 'bulk2@mineduc.gob.gt',
            role: 'editor',
            department: 'TI'
          }
        ]
      };

      const response = await request(app)
        .post('/api/invitations/bulk')
        .send(bulkData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.results.length).toBe(2);

      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('successful');
      expect(response.body.summary).toHaveProperty('failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // This would test specific error scenarios
      const response = await request(app)
        .get('/api/invitations/trigger-error')
        .expect(404); // Endpoint doesn't exist

      expect(response.body).toBeDefined();
    });

    it('should validate request formats', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .send('invalid json format')
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });
});