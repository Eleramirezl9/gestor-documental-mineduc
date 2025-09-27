import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '../components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { useUserManagement } from '../hooks/useUserManagement';
import { useUser } from '../contexts/UserContext';
import { UserForm } from '../components/users/UserForm';
import { UserProfileModal } from '../components/users/UserProfileModal';

export function UserManagement() {
  const { users, loading, fetchUsers, toggleUserStatus } = useUserManagement();
  const { user: currentUser } = useUser();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId) => {
    await toggleUserStatus(userId);
    fetchUsers();
  };

  const renderUserTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.first_name} {user.last_name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>
              {user.is_active ? 'Active' : 'Inactive'}
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(user)}
                >
                  View
                </Button>
                {currentUser.role === 'admin' && (
                  <Button
                    variant={user.is_active ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => handleToggleStatus(user.id)}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage users, their roles, and access
          </CardDescription>
          {currentUser.role === 'admin' && (
            <Button onClick={() => setIsUserFormOpen(true)}>
              Create New User
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            renderUserTable()
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {isUserFormOpen && (
        <UserForm
          onClose={() => setIsUserFormOpen(false)}
          onUserCreated={() => {
            fetchUsers();
            setIsUserFormOpen(false);
          }}
        />
      )}
    </div>
  );
}