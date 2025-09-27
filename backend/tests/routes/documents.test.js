const request = require('supertest');
const express = require('express');

// Mock Supabase before importing the router
jest.mock('../../config/supabase', () => require('../mocks/supabase.mock'));

const documentsRouter = require('../../routes/documents');

describe('Documents API', () => {
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

    app.use('/api/documents', documentsRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/documents/stats/overview/test', () => {
    it('should return comprehensive document statistics', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      // Basic statistics
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('draft');
      expect(response.body).toHaveProperty('archived');

      // Category breakdown
      expect(response.body).toHaveProperty('byCategory');
      expect(response.body.byCategory).toBeInstanceOf(Object);
      expect(Object.keys(response.body.byCategory).length).toBeGreaterThan(0);

      // Monthly trends
      expect(response.body).toHaveProperty('byMonth');
      expect(response.body.byMonth).toBeInstanceOf(Object);

      // Trends and metrics
      expect(response.body).toHaveProperty('trends');
      expect(response.body.trends).toHaveProperty('uploads_this_month');
      expect(response.body.trends).toHaveProperty('uploads_last_month');
      expect(response.body.trends).toHaveProperty('approval_rate');
      expect(response.body.trends).toHaveProperty('average_processing_time');

      // Recent activity
      expect(response.body).toHaveProperty('recent_activity');
      expect(response.body.recent_activity).toBeInstanceOf(Array);

      // Validate data types
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.pending).toBe('number');
      expect(typeof response.body.approved).toBe('number');
      expect(typeof response.body.rejected).toBe('number');
      expect(typeof response.body.draft).toBe('number');
      expect(typeof response.body.archived).toBe('number');

      expect(typeof response.body.trends.uploads_this_month).toBe('number');
      expect(typeof response.body.trends.uploads_last_month).toBe('number');
      expect(typeof response.body.trends.approval_rate).toBe('number');
      expect(typeof response.body.trends.average_processing_time).toBe('string');
    });

    it('should have valid category distribution', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const categoryTotal = Object.values(response.body.byCategory)
        .reduce((sum, count) => sum + count, 0);

      expect(categoryTotal).toBeGreaterThan(0);

      // Validate each category has a positive count
      Object.values(response.body.byCategory).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid monthly data', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const monthKeys = Object.keys(response.body.byMonth);
      expect(monthKeys.length).toBeGreaterThan(0);

      // Validate month format (YYYY-MM)
      monthKeys.forEach(month => {
        expect(month).toMatch(/^\d{4}-\d{2}$/);
      });

      // Validate monthly counts
      Object.values(response.body.byMonth).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid recent activity data', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const activities = response.body.recent_activity;
      expect(activities).toBeInstanceOf(Array);

      if (activities.length > 0) {
        activities.forEach(activity => {
          expect(activity).toHaveProperty('id');
          expect(activity).toHaveProperty('action');
          expect(activity).toHaveProperty('document_title');
          expect(activity).toHaveProperty('timestamp');
          expect(activity).toHaveProperty('user');

          // Validate timestamp format
          expect(new Date(activity.timestamp).toISOString()).toBe(activity.timestamp);

          // Validate action types
          expect(['document_approved', 'document_uploaded', 'document_rejected', 'document_updated'])
            .toContain(activity.action);
        });

        // Activities should be sorted by timestamp (most recent first)
        for (let i = 1; i < activities.length; i++) {
          const current = new Date(activities[i].timestamp);
          const previous = new Date(activities[i-1].timestamp);
          expect(current.getTime()).toBeLessThanOrEqual(previous.getTime());
        }
      }
    });

    it('should have valid approval rate', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const approvalRate = response.body.trends.approval_rate;
      expect(approvalRate).toBeGreaterThanOrEqual(0);
      expect(approvalRate).toBeLessThanOrEqual(1);
    });

    it('should calculate totals correctly', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const calculatedTotal = response.body.pending + response.body.approved +
                            response.body.rejected + response.body.draft +
                            response.body.archived;

      expect(calculatedTotal).toBeLessThanOrEqual(response.body.total);
    });
  });

  describe('GET /api/documents/stats/overview', () => {
    it('should return basic document statistics with auth', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pending');
      expect(response.body).toHaveProperty('approved');
      expect(response.body).toHaveProperty('rejected');
      expect(response.body).toHaveProperty('draft');
      expect(response.body).toHaveProperty('archived');
      expect(response.body).toHaveProperty('byCategory');

      // Validate data types
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.pending).toBe('number');
      expect(typeof response.body.approved).toBe('number');
      expect(typeof response.body.rejected).toBe('number');
      expect(typeof response.body.draft).toBe('number');
      expect(typeof response.body.archived).toBe('number');
      expect(response.body.byCategory).toBeInstanceOf(Object);
    });

    it('should return consistent data structure', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      // Required fields should be present
      const requiredFields = ['total', 'pending', 'approved', 'rejected', 'draft', 'archived', 'byCategory'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });

      // All counts should be non-negative
      const counts = [
        response.body.total,
        response.body.pending,
        response.body.approved,
        response.body.rejected,
        response.body.draft,
        response.body.archived
      ];

      counts.forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have valid category breakdown', async () => {
      const response = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      const categories = response.body.byCategory;
      expect(categories).toBeInstanceOf(Object);

      // All category counts should be non-negative
      Object.values(categories).forEach(count => {
        expect(count).toBeGreaterThanOrEqual(0);
      });

      // Category names should be strings
      Object.keys(categories).forEach(categoryName => {
        expect(typeof categoryName).toBe('string');
        expect(categoryName.length).toBeGreaterThan(0);
      });
    });
  });

  // Additional test suites can be added here for other document endpoints
  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      // This is a basic test - in real scenarios you'd test specific error conditions
      const response = await request(app)
        .get('/api/documents/non-existent-endpoint')
        .expect(404);

      // The response should be properly formatted even for errors
      expect(response.body).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should maintain data consistency across different endpoints', async () => {
      const testStatsResponse = await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const authStatsResponse = await request(app)
        .get('/api/documents/stats/overview')
        .expect(200);

      // Both endpoints should return similar data structures
      expect(testStatsResponse.body).toHaveProperty('total');
      expect(authStatsResponse.body).toHaveProperty('total');
      expect(testStatsResponse.body).toHaveProperty('byCategory');
      expect(authStatsResponse.body).toHaveProperty('byCategory');

      // Data types should be consistent
      expect(typeof testStatsResponse.body.total).toBe('number');
      expect(typeof authStatsResponse.body.total).toBe('number');
    });
  });

  describe('Performance and Scalability', () => {
    it('should return statistics within reasonable time', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/documents/stats/overview/test')
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should complete within 1 second (generous for mock data)
      expect(responseTime).toBeLessThan(1000);
    });
  });
});