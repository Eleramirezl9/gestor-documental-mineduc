import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async (filters = {}, pagination = { page: 1, pageSize: 10 }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .range(
          (pagination.page - 1) * pagination.pageSize,
          pagination.page * pagination.pageSize - 1
        )
        .order('created_at', { ascending: false });

      // Apply dynamic filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error, count } = await query;

      if (error) throw error;

      setUsers(data);
      return {
        users: data,
        totalUsers: count
      };
    } catch (err) {
      setError(err);
      toast.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (error) throw error;

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          ...userData,
          is_active: true
        });

      if (profileError) throw profileError;

      toast.success('User created successfully');
      return data.user;
    } catch (err) {
      setError(err);
      toast.error('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, updates) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success('User updated successfully');
      return data;
    } catch (err) {
      setError(err);
      toast.error('Error updating user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User deactivated successfully');
    } catch (err) {
      setError(err);
      toast.error('Error deactivating user');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId) => {
    setLoading(true);
    try {
      const { data: currentUser, error: fetchError } = await supabase
        .from('user_profiles')
        .select('is_active')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentUser.is_active })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      toast.success(`User ${data.is_active ? 'activated' : 'deactivated'}`);
      return data;
    } catch (err) {
      setError(err);
      toast.error('Error toggling user status');
    } finally {
      setLoading(false);
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus
  };
}