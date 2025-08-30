import { useState, useEffect } from 'react';
import { getApiUrl } from '@/config/api';

export function useAdminCheck() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const currentUserId = localStorage.getItem('CURRENT_USER_ID');
        if (!currentUserId) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        const response = await fetch(getApiUrl(`/api/admin/users/${currentUserId}/set-admin`), {
          method: 'GET',
          headers: {
            'X-User-Id': currentUserId,
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
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  return { isAdmin, loading };
}