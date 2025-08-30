import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useAdminCheck = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Call the API endpoint to check admin status
        const response = await fetch('/api/admin/check', {
          headers: {
            'X-User-Id': user.id,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin || false);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }

      setLoading(false);
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
};