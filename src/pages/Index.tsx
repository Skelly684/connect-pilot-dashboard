
import { Navigate } from "react-router-dom";
import { AuthPage } from "@/components/auth/AuthPage";

const Index = () => {
  // For now, we'll show the auth page. Later this will check authentication status
  const isAuthenticated = false; // This will be replaced with actual auth logic

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage />;
};

export default Index;
