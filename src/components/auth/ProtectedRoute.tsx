import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [checkingBlock, setCheckingBlock] = useState(true);

  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!user) {
        setCheckingBlock(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_blocked')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking blocked status:', error);
        } else {
          setIsBlocked(data?.is_blocked || false);
        }
      } catch (error) {
        console.error('Error checking blocked status:', error);
      } finally {
        setCheckingBlock(false);
      }
    };

    checkBlockedStatus();
  }, [user]);

  if (loading || checkingBlock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="text-center">
            <p className="font-semibold mb-2">Account Blocked</p>
            <p>Your account has been temporarily blocked. Please contact the administrator for assistance.</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};