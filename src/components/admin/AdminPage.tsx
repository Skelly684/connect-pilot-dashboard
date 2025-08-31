import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { appConfig } from '@/lib/appConfig';
import { CheckCircle, Copy, RefreshCw, Unlink, ExternalLink } from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  is_admin: boolean;
  name?: string;
  googleConnected?: boolean;
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
  const [resetPassword, setResetPassword] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [refreshingGoogle, setRefreshingGoogle] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState("/api");
  const [formData, setFormData] = useState<CreateUserForm>({
    email: '',
    password: '',
    name: '',
    is_admin: false
  });

  useEffect(() => {
    // Load saved API base URL from app config
    const config = appConfig.getConfig();
    setApiBaseUrl(config.api_base_url || "/api");
  }, []);

  const buildApiUrl = (path: string) => {
    const baseUrl = apiBaseUrl === "/api" ? "" : apiBaseUrl;
    return `${baseUrl}${path}`;
  };

  const fetchUsers = async () => {
    if (!user) return;

    try {
      console.log('Fetching users - current user:', user.id);
      
      // Use the edge function to fetch users
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'GET',
        headers: {
          'X-User-Id': user.id,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      console.log('Edge function response:', data, 'error:', error);

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      const usersWithGoogle = data || [];
      // Fetch Google status for each user
      await Promise.all(usersWithGoogle.map(async (userData) => {
        try {
          const response = await fetch(buildApiUrl(`/oauth/status?user_id=${userData.id}`), {
            headers: {
              'X-User-Id': user.id,
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            }
          });
          if (response.ok) {
            const googleData = await response.json();
            userData.googleConnected = googleData.connected || false;
          }
        } catch (error) {
          console.error(`Failed to fetch Google status for user ${userData.id}:`, error);
          userData.googleConnected = false;
        }
      }));
      
      setUsers(usersWithGoogle);
      
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
      
      // Use the edge function to create the user
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: formData,
        headers: {
          'X-User-Id': user.id,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      console.log('Edge function response:', data, 'error:', error);

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "User created successfully. They will receive a confirmation email."
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

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!user) return;

    try {
      console.log('Deleting user:', userId);
      
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'DELETE',
        body: { userId },
        headers: {
          'X-User-Id': user.id,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: `User ${userEmail} deleted successfully`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };

  const resetUserPassword = async () => {
    if (!user || !selectedUserId || !resetPassword) return;

    try {
      console.log('Resetting password for user:', selectedUserId);
      
      const { data, error } = await supabase.functions.invoke('admin-users', {
        method: 'PATCH',
        body: { userId: selectedUserId, action: 'reset_password', newPassword: resetPassword },
        headers: {
          'X-User-Id': user.id,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Password reset successfully"
      });

      setResetPassword('');
      setSelectedUserId('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: `Failed to reset password: ${error.message || error}`,
        variant: "destructive"
      });
    }
  };

  const openConnectLink = (targetUserId: string) => {
    if (!user) return;
    
    const connectUrl = buildApiUrl(`/api/google/oauth/start?user_id=${targetUserId}`);
    window.open(connectUrl, 'google-auth', 'width=520,height=700,scrollbars=yes,resizable=yes');
  };

  const copyConnectLink = async (targetUserId: string, targetEmail: string) => {
    if (!user) return;

    try {
      const response = await fetch(buildApiUrl(`/auth/google/start?user_id=${targetUserId}`), {
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json', 
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.auth_url);
        toast({
          title: "Link Copied",
          description: `Link copied. Ask ${targetEmail} to open it and finish Google consent. When the popup closes, they'll be connected.`
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || errorData.detail || errorData.message || "Failed to generate connect link",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error copying connect link:', error);
      toast({
        title: "Error",
        description: "Failed to generate connect link",
        variant: "destructive"
      });
    }
  };

  const disconnectGoogleForUser = async (targetUserId: string, targetEmail: string) => {
    if (!user) return;

    try {
      const response = await fetch(buildApiUrl(`/oauth/google/disconnect?user_id=${targetUserId}`), {
        method: 'POST',
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });

      if (response.ok) {
        toast({
          title: "Success", 
          description: `Google account disconnected for ${targetEmail}`
        });
        // Refresh the user's Google status
        await refreshSingleUserGoogleStatus(targetUserId);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.error || errorData.detail || errorData.message || "Failed to disconnect Google account",
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error disconnecting Google for user:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google account",
        variant: "destructive"
      });
    }
  };

  const refreshSingleUserGoogleStatus = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      const response = await fetch(buildApiUrl(`/oauth/status?user_id=${targetUserId}`), {
        headers: {
          'X-User-Id': user.id,
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        }
      });
      
      if (response.ok) {
        const googleData = await response.json();
        setUsers(prevUsers => 
          prevUsers.map(userData => 
            userData.id === targetUserId 
              ? { ...userData, googleConnected: googleData.connected || false }
              : userData
          )
        );
      }
    } catch (error) {
      console.error(`Failed to refresh Google status for user ${targetUserId}:`, error);
    }
  };

  const refreshAllGoogleStatuses = async () => {
    if (!user) return;
    
    setRefreshingGoogle(true);
    try {
      await Promise.all(users.map(async (userData) => {
        try {
          const response = await fetch(buildApiUrl(`/oauth/status?user_id=${userData.id}`), {
            headers: {
              'X-User-Id': user.id,
              'Accept': 'application/json',
              'ngrok-skip-browser-warning': 'true',
            }
          });
          if (response.ok) {
            const googleData = await response.json();
            userData.googleConnected = googleData.connected || false;
          }
        } catch (error) {
          console.error(`Failed to refresh Google status for user ${userData.id}:`, error);
          userData.googleConnected = false;
        }
      }));
      
      setUsers([...users]); // Force re-render
      toast({
        title: "Success",
        description: "Google statuses refreshed for all users"
      });
    } catch (error) {
      console.error('Error refreshing Google statuses:', error);
      toast({
        title: "Error",
        description: "Failed to refresh Google statuses",
        variant: "destructive"
      });
    } finally {
      setRefreshingGoogle(false);
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
          <div className="flex items-center justify-between">
            <CardTitle>Existing Users</CardTitle>
            <Button
              onClick={refreshAllGoogleStatuses}
              disabled={refreshingGoogle}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshingGoogle ? 'animate-spin' : ''}`} />
              Refresh Google Statuses
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Admin Status</TableHead>
                <TableHead>Google</TableHead>
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
                    <div className="flex items-center gap-2">
                      {userData.googleConnected ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Connected</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => refreshSingleUserGoogleStatus(userData.id)}
                        title="Refresh Google status for this user"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={userData.is_admin}
                        onCheckedChange={(checked) => toggleAdminStatus(userData.id, checked)}
                      />
                      
                      <Button
                        onClick={() => openConnectLink(userData.id)}
                        variant="outline"
                        size="sm"
                        title="Open Google connect for this user"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open Connect Link
                      </Button>

                      <Button
                        onClick={() => copyConnectLink(userData.id, userData.email)}
                        variant="outline"
                        size="sm"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Connect Link
                      </Button>

                      <Button
                        onClick={() => disconnectGoogleForUser(userData.id, userData.email)}
                        variant="outline"
                        size="sm"
                        disabled={!userData.googleConnected}
                      >
                        <Unlink className="h-4 w-4 mr-1" />
                        Disconnect Google
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedUserId(userData.id)}
                          >
                            Reset Password
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset Password for {userData.email}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="new-password">New Password</Label>
                              <Input
                                id="new-password"
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                placeholder="Enter new password"
                              />
                            </div>
                            <Button 
                              onClick={resetUserPassword}
                              disabled={!resetPassword}
                              className="w-full"
                            >
                              Reset Password
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {userData.email}? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(userData.id, userData.email)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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