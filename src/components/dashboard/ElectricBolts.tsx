import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

export const ElectricBolts = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isActive, setIsActive] = useState(false);
  
  const isSpecialUser = user?.email === 'scttskelly@gmail.com';
  const isDark = theme === 'dark';
  
  useEffect(() => {
    if (!isSpecialUser || !isDark) return;
    
    // Trigger every 60 seconds
    const interval = setInterval(() => {
      setIsActive(true);
      
      // Deactivate after 5 seconds
      setTimeout(() => {
        setIsActive(false);
      }, 5000);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isSpecialUser, isDark]);
  
  if (!isSpecialUser || !isDark || !isActive) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Electric bolt 1 */}
      <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-purple-500 to-transparent opacity-0 animate-bolt-1">
        <div className="absolute inset-0 bg-purple-400 blur-xl"></div>
      </div>
      
      {/* Electric bolt 2 */}
      <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-0 animate-bolt-2" style={{ animationDelay: '0.3s' }}>
        <div className="absolute inset-0 bg-blue-300 blur-xl"></div>
      </div>
      
      {/* Electric bolt 3 */}
      <div className="absolute top-0 left-2/3 w-1 h-full bg-gradient-to-b from-transparent via-violet-500 to-transparent opacity-0 animate-bolt-3" style={{ animationDelay: '0.6s' }}>
        <div className="absolute inset-0 bg-violet-400 blur-xl"></div>
      </div>
      
      {/* Electric bolt 4 */}
      <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-0 animate-bolt-4" style={{ animationDelay: '0.9s' }}>
        <div className="absolute inset-0 bg-purple-300 blur-xl"></div>
      </div>
      
      {/* Diagonal bolts */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 -left-1/4 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 animate-bolt-diagonal-1 rotate-45 origin-center">
          <div className="absolute inset-0 bg-purple-400 blur-lg"></div>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-2/3 -right-1/4 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 animate-bolt-diagonal-2 -rotate-45 origin-center" style={{ animationDelay: '0.5s' }}>
          <div className="absolute inset-0 bg-blue-300 blur-lg"></div>
        </div>
      </div>
      
      {/* Pulsing glow effect */}
      <div className="absolute inset-0 bg-purple-500/5 animate-pulse-slow"></div>
    </div>
  );
};
