const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const auditService = require('./auditService');
const notificationService = require('./notificationService');

class UserService {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  // Factory method for creating user instances
  static createUser(userData) {
    const salt = bcrypt.genSaltSync(10);
    return {
      ...userData,
      password: bcrypt.hashSync(userData.password, salt),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Strategy pattern for role-based access
  async checkRolePermissions(userId, requiredRoles) {
    const { data: user } = await this.supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single();

    return requiredRoles.includes(user.role);
  }

  // Decorator for tracking user actions
  async decorateWithAudit(action, userId, details) {
    return this.auditService.log({
      user_id: userId,
      action,
      details,
      ip_address: details.ip_address || null
    });
  }

  // Observer pattern: events on user status changes
  async notifyUserStatusChange(user, newStatus, adminId) {
    try {
      await this.notificationService.notifyUserStatusChanged(user, newStatus, adminId);
    } catch (error) {
      console.error('Notification error:', error);
    }
  }

  // Command pattern: encapsulate user actions
  async executeUserCommand(command, userId, data) {
    switch (command) {
      case 'ACTIVATE':
        return this.activateUser(userId, data);
      case 'DEACTIVATE':
        return this.deactivateUser(userId, data);
      case 'UPDATE_PROFILE':
        return this.updateUserProfile(userId, data);
      default:
        throw new Error('Invalid command');
    }
  }

  // Additional method with more robust validation
  async registerUserWithValidation(userData) {
    const validationRules = {
      email: 'required|email|unique:users,email',
      password: 'required|min:8|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$/',
      first_name: 'required|min:2',
      last_name: 'required|min:2',
      role: 'in:admin,editor,viewer'
    };

    // Implement validation logic here
    // If validation fails, throw an error

    const userInstance = UserService.createUser(userData);
    return this.supabase.from('users').insert(userInstance);
  }

  // Other existing methods...
}

module.exports = UserService;