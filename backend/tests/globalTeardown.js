/**
 * Global teardown for Jest tests
 * Runs once after all tests complete
 */

module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...');

  // Clean up any global resources if needed
  // For example: close database connections, stop mock servers, etc.

  // Reset environment variables
  delete process.env.JWT_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('✅ Global test cleanup completed');
};