const { createClient } = require('@supabase/supabase-js');

class UserRepository {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async findById(userId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async createUser(userData) {
    const { data, error } = await this.supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateUser(userId, updateData) {
    const { data, error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteUser(userId) {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw new Error(error.message);
    return true;
  }

  async listUsers(filters = {}, pagination = { page: 1, pageSize: 10 }) {
    const { page, pageSize } = pagination;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const query = this.supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(start, end);

    Object.entries(filters).forEach(([key, value]) => {
      query.eq(key, value);
    });

    const { data, count, error } = await query;

    if (error) throw new Error(error.message);
    return { users: data, total: count };
  }
}

module.exports = UserRepository;