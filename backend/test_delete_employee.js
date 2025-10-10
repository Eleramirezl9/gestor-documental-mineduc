const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testDeleteEmployee() {
  try {
    console.log('🧪 Test Manual: DELETE /api/employee-documents/employee/:id\n');

    // 1. Login como admin para obtener token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@mineduc.gob.gt',
      password: 'Admin123!'
    });

    const token = loginResponse.data.session.access_token;
    console.log('✅ Login successful, token obtained\n');

    // 2. Crear un empleado de prueba
    console.log('2️⃣ Creating test employee...');
    const newEmployee = {
      email: `test.delete.${Date.now()}@mineduc.gob.gt`,
      first_name: 'Test',
      last_name: 'Delete',
      department: 'Test Department',
      phone: '+502 2411-9999',
      employee_id: `TEST${Date.now()}`,
      position: 'Test Position',
      hire_date: '2024-01-01'
    };

    const createResponse = await axios.post(
      `${API_BASE_URL}/employee-documents/register`,
      newEmployee,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const employeeId = createResponse.data.employee.id;
    console.log(`✅ Employee created with ID: ${employeeId}`);
    console.log(`   Name: ${createResponse.data.employee.first_name} ${createResponse.data.employee.last_name}\n`);

    // 3. Verificar que el empleado existe
    console.log('3️⃣ Verifying employee exists...');
    const getResponse = await axios.get(
      `${API_BASE_URL}/employee-documents/employees`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: newEmployee.email }
      }
    );

    const foundEmployee = getResponse.data.employees.find(e => e.id === employeeId);
    if (foundEmployee) {
      console.log(`✅ Employee found in database\n`);
    } else {
      console.log(`❌ Employee not found!\n`);
      return;
    }

    // 4. Eliminar el empleado
    console.log('4️⃣ Deleting employee...');
    const deleteResponse = await axios.delete(
      `${API_BASE_URL}/employee-documents/employee/${employeeId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('✅ Delete response:', deleteResponse.data);
    console.log(`   Status: ${deleteResponse.status}`);
    console.log(`   Message: ${deleteResponse.data.message}\n`);

    // 5. Verificar que el empleado ya no existe
    console.log('5️⃣ Verifying employee was deleted...');
    const verifyResponse = await axios.get(
      `${API_BASE_URL}/employee-documents/employees`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: newEmployee.email }
      }
    );

    const stillExists = verifyResponse.data.employees.find(e => e.id === employeeId);
    if (!stillExists) {
      console.log(`✅ Employee successfully deleted from database\n`);
    } else {
      console.log(`❌ Employee still exists in database!\n`);
      return;
    }

    console.log('🎉 All tests passed! DELETE endpoint working correctly.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
testDeleteEmployee();
