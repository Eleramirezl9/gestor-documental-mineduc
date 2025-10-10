/**
 * Mock implementation of Supabase for testing
 * Simula las operaciones de base de datos para las pruebas
 */

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@mineduc.gob.gt',
    first_name: 'Administrador',
    last_name: 'MINEDUC',
    role: 'admin',
    department: 'TI',
    is_active: true,
    employee_id: 'MIN25001',
    phone: '+502 2411-9595',
    position: 'Administrador del Sistema',
    created_at: '2024-01-15T08:00:00Z'
  },
  {
    id: 'user-2',
    email: 'editor@mineduc.gob.gt',
    first_name: 'Editor',
    last_name: 'MINEDUC',
    role: 'editor',
    department: 'Recursos Humanos',
    is_active: true,
    employee_id: 'MIN25002',
    phone: '+502 2411-9596',
    position: 'Editor de Documentos',
    created_at: '2024-01-16T08:00:00Z'
  },
  {
    id: 'user-3',
    email: 'viewer@mineduc.gob.gt',
    first_name: 'Viewer',
    last_name: 'MINEDUC',
    role: 'viewer',
    department: 'Secretaría',
    is_active: true,
    employee_id: 'MIN25003',
    phone: '+502 2411-9597',
    position: 'Consultor',
    created_at: '2024-01-17T08:00:00Z'
  }
];

const mockDocuments = [
  {
    id: 'doc-1',
    title: 'DPI Administrador',
    status: 'approved',
    user_id: 'user-1',
    category_id: 'cat-1',
    created_at: '2024-01-15T08:00:00Z',
    expiration_date: '2025-12-31'
  },
  {
    id: 'doc-2',
    title: 'Certificado Médico Editor',
    status: 'pending',
    user_id: 'user-2',
    category_id: 'cat-2',
    created_at: '2024-01-16T08:00:00Z',
    expiration_date: '2024-12-15'
  },
  {
    id: 'doc-3',
    title: 'Antecedentes Penales Viewer',
    status: 'expired',
    user_id: 'user-3',
    category_id: 'cat-1',
    created_at: '2024-01-17T08:00:00Z',
    expiration_date: '2024-10-01'
  }
];

const mockInvitations = [
  {
    id: 'inv-1',
    email: 'nuevo.usuario@mineduc.gob.gt',
    role: 'viewer',
    status: 'pending',
    created_by: 'user-1',
    created_at: '2024-01-20T08:00:00Z',
    expires_at: '2024-02-20T08:00:00Z'
  }
];

const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-1',
    title: 'Documento aprobado',
    message: 'Su documento ha sido aprobado exitosamente',
    type: 'success',
    status: 'unread',
    created_at: new Date().toISOString()
  }
];

const mockEmployees = [
  {
    id: 'test-employee-id',
    email: 'empleado.test@mineduc.gob.gt',
    first_name: 'Juan',
    last_name: 'Pérez',
    department: 'TI',
    employee_id: 'MIN25100',
    phone: '+502 2411-9500',
    position: 'Desarrollador',
    hire_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z'
  },
  {
    id: 'test-employee-with-docs',
    email: 'empleado.docs@mineduc.gob.gt',
    first_name: 'María',
    last_name: 'González',
    department: 'Recursos Humanos',
    employee_id: 'MIN25101',
    phone: '+502 2411-9501',
    position: 'Analista',
    hire_date: '2024-02-01',
    is_active: true,
    created_at: '2024-02-01T08:00:00Z'
  }
];

const mockEmployeeDocuments = [
  {
    id: 'emp-doc-1',
    employee_id: 'test-employee-with-docs',
    document_type: 'DPI',
    status: 'approved',
    created_at: '2024-02-01T08:00:00Z'
  },
  {
    id: 'emp-doc-2',
    employee_id: 'test-employee-with-docs',
    document_type: 'Certificado Médico',
    status: 'pending',
    created_at: '2024-02-01T08:00:00Z'
  }
];

// Mock de Supabase client
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: function(columns = '*') {
      this.selectedColumns = columns;
      return this;
    },

    from: function(table) {
      this.table = table;
      this.data = this.getMockData(table);
      return this;
    },
  

    getMockData: function(table) {
      switch (table) {
        case 'user_profiles':
          return mockUsers;
        case 'documents':
          return mockDocuments;
        case 'invitations':
          return mockInvitations;
        case 'notifications':
          return mockNotifications;
        case 'employees':
          return [...mockEmployees];
        case 'employee_document_requirements':
          return [...mockEmployeeDocuments];
        default:
          return [];
      }
    },

    eq: function(column, value) {
      this.data = this.data.filter(item => item[column] === value);
      return this;
    },

    like: function(column, pattern) {
      const regex = new RegExp(pattern.replace('%', '.*'), 'i');
      this.data = this.data.filter(item => regex.test(item[column]));
      return this;
    },

    or: function(conditions) {
      // Simplified OR implementation
      return this;
    },

    not: function(column, operator, value) {
      if (operator === 'is' && value === null) {
        this.data = this.data.filter(item => item[column] !== null);
      }
      return this;
    },

    range: function(from, to) {
      this.data = this.data.slice(from, to + 1);
      return this;
    },

    order: function(column, options = {}) {
      const { ascending = true } = options;
      this.data.sort((a, b) => {
        if (ascending) {
          return a[column] > b[column] ? 1 : -1;
        } else {
          return a[column] < b[column] ? 1 : -1;
        }
      });
      return this;
    },

    single: function() {
      const result = this.data[0] || null;
      return Promise.resolve({ data: result, error: result ? null : { code: 'PGRST116' } });
    },

    insert: function(data) {
      const newItem = Array.isArray(data) ? data[0] : data;
      newItem.id = newItem.id || `generated-${Date.now()}`;
      newItem.created_at = newItem.created_at || new Date().toISOString();

      // Add to mock data
      if (this.table === 'user_profiles') {
        mockUsers.push(newItem);
      } else if (this.table === 'invitations') {
        mockInvitations.push(newItem);
      } else if (this.table === 'notifications') {
        mockNotifications.push(newItem);
      }

      return this;
    },

    update: function(data) {
      this.updateData = data;
      return this;
    },

    delete: function() {
      this.isDelete = true;

      // Actually remove items from mock data arrays
      if (this.table === 'employees') {
        const idsToDelete = this.data.map(item => item.id);
        const index = mockEmployees.findIndex(emp => idsToDelete.includes(emp.id));
        if (index !== -1) {
          mockEmployees.splice(index, 1);
        }
      } else if (this.table === 'employee_document_requirements') {
        const idsToDelete = this.data.map(item => item.id);
        idsToDelete.forEach(id => {
          const index = mockEmployeeDocuments.findIndex(doc => doc.id === id);
          if (index !== -1) {
            mockEmployeeDocuments.splice(index, 1);
          }
        });
      }

      return this;
    },

    // Finalize the query and return promise
    then: function(callback) {
      const result = this.isDelete ?
        { data: null, error: null } :
        { data: this.data, error: null };
      return callback(result);
    }
  };

  return {
    from: (table) => {
      const query = Object.create(mockQuery);
      return query.from(table);
    },

    auth: {
      getUser: () => Promise.resolve({
        data: {
          user: {
            id: 'user-1',
            email: 'admin@mineduc.gob.gt',
            role: 'admin'
          }
        },
        error: null
      }),

      signInWithPassword: ({ email, password }) => {
        const user = mockUsers.find(u => u.email === email);
        if (user && password === 'password') {
          return Promise.resolve({
            data: {
              user: user,
              session: { access_token: 'mock-jwt-token' }
            },
            error: null
          });
        }
        return Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' }
        });
      },

      admin: {
        listUsers: () => Promise.resolve({
          data: { users: mockUsers },
          error: null
        }),

        inviteUserByEmail: (email) => Promise.resolve({
          data: { user: { email } },
          error: null
        })
      }
    }
  };
};

const mockSupabaseClient = createMockSupabaseClient();

module.exports = {
  supabase: mockSupabaseClient,
  supabaseAdmin: mockSupabaseClient, // Same mock for admin
  mockUsers,
  mockDocuments,
  mockInvitations,
  mockNotifications,
  mockEmployees,
  mockEmployeeDocuments
};