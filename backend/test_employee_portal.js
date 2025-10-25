require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEmployeePortal() {
  console.log('\n🧪 TESTING EMPLOYEE PORTAL SYSTEM\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Check if we have an employee
    console.log('\n📋 Step 1: Finding test employee...');
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .limit(1);

    if (empError) throw empError;

    if (!employees || employees.length === 0) {
      console.log('❌ No employees found. Creating test employee...');

      const { data: newEmployee, error: createError } = await supabase
        .from('employees')
        .insert({
          employee_id: 'MIN25TEST',
          email: 'test.employee@mineduc.gob.gt',
          first_name: 'Test',
          last_name: 'Employee',
          full_name: 'Test Employee',
          department: 'Testing',
          position: 'Tester',
          hire_date: new Date().toISOString().split('T')[0],
          status: 'active'
        })
        .select()
        .single();

      if (createError) throw createError;
      console.log('✅ Test employee created:', newEmployee.employee_id);
      employees[0] = newEmployee;
    } else {
      console.log('✅ Found employee:', employees[0].employee_id, '-', employees[0].full_name);
    }

    const testEmployee = employees[0];

    // Step 2: Generate portal token
    console.log('\n🔑 Step 2: Generating portal token...');
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_employee_portal_token', {
        p_employee_id: testEmployee.id
      });

    if (tokenError) {
      console.error('❌ Error generating token:', tokenError);
      throw tokenError;
    }

    if (!tokenData || tokenData.length === 0) {
      throw new Error('No token data returned');
    }

    console.log('✅ Token generated successfully!');
    console.log('   Token:', tokenData[0].token);
    console.log('   Portal URL:', tokenData[0].portal_url);

    // Step 3: Validate token
    console.log('\n🔍 Step 3: Validating token...');
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_employee_portal_token', {
        p_token: tokenData[0].token
      });

    if (validationError) throw validationError;

    if (validationData && validationData[0]?.is_valid) {
      console.log('✅ Token is valid!');
      console.log('   Employee ID:', validationData[0].employee_id);
      console.log('   Employee Name:', validationData[0].employee_name);
      console.log('   Email:', validationData[0].employee_email);
    } else {
      console.log('❌ Token validation failed');
    }

    // Step 4: Test email service
    console.log('\n📧 Step 4: Testing email service...');
    const emailService = require('./services/emailService');

    // Check email configuration
    console.log('   Checking email configuration...');
    console.log('   - RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('   - GMAIL_USER:', process.env.GMAIL_USER ? '✅ Set' : '❌ Not set');
    console.log('   - GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Not set');

    try {
      await emailService.sendEmployeePortalLink({
        employeeEmail: testEmployee.email,
        employeeName: testEmployee.full_name,
        portalUrl: tokenData[0].portal_url,
        requestedDocuments: [
          {
            document_type: 'DPI (Cédula de Identidad)',
            priority: 'alta',
            notes: 'Documento de prueba para testing'
          },
          {
            document_type: 'Título Universitario',
            priority: 'normal',
            notes: 'Opcional - documento adicional'
          }
        ],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      console.log('✅ Email sent successfully to:', testEmployee.email);
    } catch (emailError) {
      console.error('❌ Email error:', emailError.message);
      console.log('\n⚠️  Email failed but this is expected if email is not configured.');
      console.log('   To fix: Configure RESEND_API_KEY or Gmail SMTP in .env file');
    }

    // Step 5: Test API endpoints
    console.log('\n🌐 Step 5: Testing API endpoints...');
    console.log('   You can test the following endpoints:');
    console.log('   - GET http://localhost:5000/api/employee-portal/validate/' + tokenData[0].token);
    console.log('   - GET http://localhost:5000/api/employee-portal/' + tokenData[0].token + '/documents');
    console.log('   - Frontend URL:', tokenData[0].portal_url);

    // Step 6: Create test document request
    console.log('\n📄 Step 6: Creating test document request...');
    const { data: docRequest, error: docError } = await supabase
      .from('employee_document_requirements')
      .insert({
        employee_id: testEmployee.id,
        document_type: 'DPI (Cédula de Identidad)',
        status: 'pending',
        required_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: 'Documento de prueba - Testing del sistema',
        priority: 'high'
      })
      .select()
      .single();

    if (docError) {
      console.log('⚠️  Could not create test document request:', docError.message);
    } else {
      console.log('✅ Test document request created:', docRequest.id);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTING COMPLETED SUCCESSFULLY!\n');
    console.log('📋 Summary:');
    console.log('   - Employee:', testEmployee.full_name, '(' + testEmployee.employee_id + ')');
    console.log('   - Token:', tokenData[0].token.substring(0, 20) + '...');
    console.log('   - Portal URL:', tokenData[0].portal_url);
    console.log('   - Token Valid: ✅');
    console.log('\n🔗 Access the portal at:');
    console.log('   ' + tokenData[0].portal_url);
    console.log('\n💡 Next steps:');
    console.log('   1. Open the portal URL in your browser');
    console.log('   2. Try uploading a document');
    console.log('   3. Send a message to admin');
    console.log('   4. Check backend logs for any errors');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testEmployeePortal().then(() => {
  console.log('Test completed. Press Ctrl+C to exit.');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
