/**
 * Global setup for Jest tests
 * Runs once before all tests
 */

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');

  // Set global environment variables for all tests
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5000'; // Use different port for tests
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  process.env.SUPABASE_URL = 'https://mock-supabase-url.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'mock-anon-key-for-testing';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-for-testing';
  process.env.RATE_LIMIT_MAX_REQUESTS = '1000'; // High limit for tests

  // Mock external API endpoints that might be called
  process.env.OPENAI_API_KEY = 'mock-openai-api-key-for-testing';

  console.log('✅ Global test environment ready');
};