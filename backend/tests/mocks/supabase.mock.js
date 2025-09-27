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

module.exports = {
  supabase: createMockSupabaseClient(),
  mockUsers,
  mockDocuments,
  mockInvitations,
  mockNotifications
};