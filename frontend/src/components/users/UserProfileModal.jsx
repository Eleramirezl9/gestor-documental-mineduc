import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';

export function UserProfileModal({ user, onClose }) {
  const renderProfileField = (label, value) => (
    <div className="flex justify-between py-2 border-b">
      <span className="font-medium">{label}</span>
      <span>{value || 'Not specified'}</span>
    </div>
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
          <DialogDescription>
            Detailed information about the user
          </DialogDescription>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  {user.first_name} {user.last_name}
                </h2>
                <Badge
                  variant={user.is_active ? 'default' : 'destructive'}
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {renderProfileField('Email', user.email)}
            {renderProfileField('Role', user.role)}
            {renderProfileField('Department', user.department)}
            {renderProfileField('Position', user.position)}
            {renderProfileField('Phone', user.phone)}

            <div className="mt-4 flex justify-between text-sm text-muted-foreground">
              <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
              <span>Last Updated: {new Date(user.updated_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}