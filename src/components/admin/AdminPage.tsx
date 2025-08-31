import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    is_admin: false
  });

  const fetchUsers = async () => {
    if (!user) return;

    try {
      console.log('Fetching users - current user:', user.id);
      
      // First check if current user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      console.log('Current user profile:', profile, 'error:', profileError);

      if (profileError) {
        console.error('Profile error:', profileError);
        // If no profile exists, create one for this user
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            is_admin: false
          });
        
        if (insertError) {
          console.error('Failed to create profile:', insertError);
        }
        
        toast({
          title: "Info",
          description: "Profile created. Please refresh to continue.",
          variant: "default"
        });
        return;
      }

      if (!profile?.is_admin) {
        toast({
          title: "Error", 
          description: "Admin access required",
          variant: "destructive"
        });
        return;
      }

      // If admin, try to get all profiles directly first
      console.log('User is admin, fetching all profiles...');
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at, is_admin')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles directly:', profilesError);
        throw profilesError;
      }

      console.log('Found profiles:', allProfiles);
      setUsers(allProfiles || []);
      
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users. Check console for details.",
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
      console.log('Creating user with data:', formData);
      
      // Create user directly using Supabase admin
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true
      });

      console.log('Auth user created:', authUser, 'error:', authError);

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          email: formData.email,
          is_admin: formData.is_admin || false
        });

      console.log('Profile creation error:', profileError);

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
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
        description: `Failed to create user: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    if (!user) return;

    try {
      console.log('Toggling admin status for user:', userId, 'to:', isAdmin);
      
      // Update admin status directly
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId);

      if (error) {
        console.error('Update error:', error);
        throw error;
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
        description: `Failed to update admin status: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'PSNai684!') {
      setIsAuthenticated(true);
      fetchUsers();
    } else {
      toast({
        title: "Error",
        description: "Incorrect password",
        variant: "destructive"
      });
      setPassword('');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [user, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Access</h1>
          <p className="text-muted-foreground">Enter the admin password to continue</p>
        </div>
        
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Password Required</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="admin-password">Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Access Admin Panel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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