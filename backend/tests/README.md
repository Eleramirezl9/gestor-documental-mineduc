# Test Suite - MINEDUC Document Management Backend

## Overview
Comprehensive test suite for the MINEDUC Document Management System backend API. Tests are implemented using Jest and Supertest with extensive mocking to ensure fast, reliable, and isolated testing.

## Test Structure

### 📁 Directory Structure
```
tests/
├── mocks/
│   └── supabase.mock.js      # Mock Supabase client and data
├── routes/
│   ├── users.test.js         # User management API tests
│   ├── employeeDocuments.test.js # Employee documents API tests
│   ├── documents.test.js     # Documents API tests
│   └── invitations.test.js   # Invitations API tests
├── services/                 # Service layer tests (future)
├── setup.js                  # Jest setup configuration
├── globalSetup.js           # Global test environment setup
├── globalTeardown.js        # Global test cleanup
└── README.md                # This file
```

## Test Coverage

### 🧑‍💼 Users API (`/api/users/enhanced`)
- ✅ List users with pagination, search, and filtering
- ✅ Get specific user details
- ✅ Create new users with validation
- ✅ Update existing users
- ✅ Activate/deactivate users
- ✅ User statistics and analytics

### 👥 Employee Documents API (`/api/employee-documents`)
- ✅ List employees with document status
- ✅ Filter by department, status, search terms
- ✅ Get expiring documents
- ✅ Register new employees
- ✅ Update document status
- ✅ Generate reports
- ✅ Process notifications
- ✅ Get departments list

### 📄 Documents API (`/api/documents`)
- ✅ Document statistics with comprehensive metrics
- ✅ Category and status breakdowns
- ✅ Monthly trends and analytics
- ✅ Recent activity tracking
- ✅ Performance and data validation tests

### 📧 Invitations API (`/api/invitations`)
- ✅ List and filter invitations
- ✅ Create, update, and delete invitations
- ✅ Resend invitations
- ✅ Bulk operations
- ✅ Invitation statistics
- ✅ Comprehensive validation testing

## Mock Data

### 🎭 Supabase Mock
The `supabase.mock.js` file provides:
- Mock users with different roles (admin, editor, viewer)
- Mock documents with various statuses
- Mock invitations with different states
- Mock notifications
- Simulated database operations (select, insert, update, delete)
- Query chaining support (where, order, pagination)

### 🔧 Service Mocks
- **Email Service**: Mock email sending functionality
- **OCR Service**: Mock text extraction from documents
- **AI Service**: Mock document classification and summaries

## Test Features

### 🛡️ Security Testing
- Authentication middleware validation
- Role-based access control testing
- Input validation and sanitization
- Error handling and security responses

### 📊 Data Validation
- Request/response schema validation
- Data type and format verification
- Business logic validation
- Edge case handling

### 🚀 Performance Testing
- Response time validation
- Memory usage monitoring (basic)
- Concurrent request handling
- Scalability indicators

### 🔄 Integration Testing
- API endpoint integration
- Service layer integration
- Database operation simulation
- Cross-module functionality

## Running Tests

### Prerequisites
```bash
npm install
```

### Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test users.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should return"

# Generate coverage report
npm test -- --coverage --coverageDirectory=./coverage
```

### Environment Variables
Tests automatically set these environment variables:
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret-for-testing-only`
- `SUPABASE_URL=mock-supabase-url`
- `SUPABASE_ANON_KEY=mock-anon-key`
- `SUPABASE_SERVICE_ROLE_KEY=mock-service-role-key`

## Test Configuration

### Coverage Thresholds
- **Lines**: 50%
- **Functions**: 50%
- **Branches**: 50%
- **Statements**: 50%

### Custom Matchers
- `toBeValidDate()`: Validates date objects
- `toBeValidEmail()`: Validates email format
- `toBeValidUUID()`: Validates UUID format (with mock support)

## Writing New Tests

### 1. Create Test File
```javascript
const request = require('supertest');
const express = require('express');

// Mock Supabase before importing router
jest.mock('../../config/supabase', () => require('../mocks/supabase.mock'));

const yourRouter = require('../../routes/yourRouter');

describe('Your API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mock authentication
    app.use((req, res, next) => {
      req.user = testUtils.createMockUser();
      next();
    });

    app.use('/api/your-endpoint', yourRouter);
  });

  // Your tests here
});
```

### 2. Test Structure
```javascript
describe('Endpoint Group', () => {
  describe('GET /endpoint', () => {
    it('should return expected data', async () => {
      const response = await request(app)
        .get('/api/endpoint')
        .expect(200);

      expect(response.body).toHaveProperty('expectedField');
    });
  });
});
```

### 3. Using Mock Data
```javascript
// Use global test utils
const mockUser = testUtils.createMockUser({ role: 'admin' });
const mockDocument = testUtils.createMockDocument({ status: 'approved' });

// Or create custom mocks
const customMock = {
  id: 'custom-id',
  customField: 'value'
};
```

## Best Practices

### ✅ Do's
- Use descriptive test names
- Test both success and error cases
- Validate response structure and data types
- Mock external dependencies
- Use beforeEach/afterEach for cleanup
- Test edge cases and boundary conditions

### ❌ Don'ts
- Don't use real API calls in tests
- Don't rely on external services
- Don't use production data
- Don't skip validation testing
- Don't forget to clean up after tests

## Debugging Tests

### Common Issues
1. **Mock not working**: Ensure mock is imported before the module
2. **Async issues**: Use `async/await` properly
3. **Timeout errors**: Increase test timeout or check for infinite loops
4. **Memory leaks**: Clean up timers and event listeners

### Debug Commands
```bash
# Run with verbose output
npm test -- --verbose

# Run single test with debugging
npm test -- --testNamePattern="specific test name" --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Contributing

When adding new tests:
1. Follow the existing patterns and structure
2. Add appropriate documentation
3. Ensure all tests pass
4. Update coverage if adding new routes/services
5. Add mock data for new endpoints

## Future Improvements

### Planned Enhancements
- [ ] Service layer unit tests
- [ ] Middleware unit tests
- [ ] Integration tests with real database (separate environment)
- [ ] Load testing capabilities
- [ ] Automated API documentation validation
- [ ] Visual regression testing for responses
- [ ] Contract testing between frontend and backend

### Performance Monitoring
- Response time tracking
- Memory usage monitoring
- Test execution time optimization
- Coverage improvement strategies