import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/config/api';

interface User {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  name?: string;
}

interface CreateUserForm {
  email: string;
  password: string;
  name: string;
  is_admin: boolean;
}

export const AdminPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    is_admin: false
  });

  const fetchUsers = async () => {
    if (!user) return;

    try {
      const response = await fetch(getApiUrl('/api/admin/users'), {
        headers: {
          'X-User-Id': user.id,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    try {
      const response = await fetch(getApiUrl('/api/admin/users'), {
        method: 'POST',
        headers: {
          'X-User-Id': user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      toast({
        title: "Success",
        description: "User created successfully"
      });

      setFormData({ email: '', password: '', name: '', is_admin: false });
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    if (!user) return;

    try {
      const response = await fetch(getApiUrl(`/api/admin/users/${userId}/set-admin`), {
        method: 'POST',
        headers: {
          'X-User-Id': user.id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_admin: isAdmin })
      });

      if (!response.ok) {
        throw new Error('Failed to update admin status');
      }

      toast({
        title: "Success",
        description: `User admin status ${isAdmin ? 'enabled' : 'disabled'}`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast({
        title: "Error",
        description: "Failed to update admin status",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and system settings</p>
      </div>

      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_admin"
                checked={formData.is_admin}
                onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
              />
              <Label htmlFor="is_admin">Admin User</Label>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Admin Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell>{userData.email}</TableCell>
                  <TableCell>{userData.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(userData.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {userData.is_admin ? 'Admin' : 'User'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={userData.is_admin}
                      onCheckedChange={(checked) => toggleAdminStatus(userData.id, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};