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
      {/* Screen flash effect */}
      <div className="absolute inset-0 bg-white animate-lightning-flash"></div>
      
      {/* Thick Electric bolts - Vertical */}
      <div className="absolute top-0 left-1/6 w-3 h-full bg-gradient-to-b from-purple-300 via-purple-500 to-purple-300 opacity-0 animate-bolt-1">
        <div className="absolute inset-0 bg-purple-400 blur-2xl"></div>
        <div className="absolute inset-0 bg-white blur-sm"></div>
      </div>
      
      <div className="absolute top-0 left-1/4 w-4 h-full bg-gradient-to-b from-blue-200 via-blue-400 to-blue-200 opacity-0 animate-bolt-2" style={{ animationDelay: '0.15s' }}>
        <div className="absolute inset-0 bg-blue-300 blur-2xl"></div>
        <div className="absolute inset-0 bg-white blur-sm"></div>
      </div>
      
      <div className="absolute top-0 right-1/3 w-3 h-full bg-gradient-to-b from-violet-200 via-violet-500 to-violet-200 opacity-0 animate-bolt-3" style={{ animationDelay: '0.3s' }}>
        <div className="absolute inset-0 bg-violet-400 blur-2xl"></div>
        <div className="absolute inset-0 bg-white blur-sm"></div>
      </div>
      
      <div className="absolute top-0 left-2/3 w-4 h-full bg-gradient-to-b from-purple-200 via-purple-600 to-purple-200 opacity-0 animate-bolt-4" style={{ animationDelay: '0.45s' }}>
        <div className="absolute inset-0 bg-purple-500 blur-2xl"></div>
        <div className="absolute inset-0 bg-white blur-sm"></div>
      </div>
      
      <div className="absolute top-0 right-1/4 w-3 h-full bg-gradient-to-b from-blue-300 via-blue-500 to-blue-300 opacity-0 animate-bolt-1" style={{ animationDelay: '0.6s' }}>
        <div className="absolute inset-0 bg-blue-400 blur-2xl"></div>
        <div className="absolute inset-0 bg-white blur-sm"></div>
      </div>
      
      <div className="absolute top-0 left-1/2 w-5 h-full bg-gradient-to-b from-white via-purple-400 to-white opacity-0 animate-bolt-2" style={{ animationDelay: '0.75s' }}>
        <div className="absolute inset-0 bg-purple-300 blur-3xl"></div>
        <div className="absolute inset-0 bg-white blur-md"></div>
      </div>
      
      {/* Thick Diagonal bolts */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/4 -left-1/4 w-[150%] h-2 bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-0 animate-bolt-diagonal-1 rotate-45 origin-center">
          <div className="absolute inset-0 bg-purple-300 blur-2xl"></div>
          <div className="absolute inset-0 bg-white blur-lg"></div>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-2/3 -right-1/4 w-[150%] h-2 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-0 animate-bolt-diagonal-2 -rotate-45 origin-center" style={{ animationDelay: '0.4s' }}>
          <div className="absolute inset-0 bg-blue-300 blur-2xl"></div>
          <div className="absolute inset-0 bg-white blur-lg"></div>
        </div>
      </div>
      
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-1/2 -left-1/4 w-[150%] h-2 bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 animate-bolt-diagonal-1 -rotate-45 origin-center" style={{ animationDelay: '0.8s' }}>
          <div className="absolute inset-0 bg-violet-400 blur-2xl"></div>
          <div className="absolute inset-0 bg-white blur-lg"></div>
        </div>
      </div>
      
      {/* Intense pulsing glow effect */}
      <div className="absolute inset-0 bg-purple-400/20 animate-pulse-intense"></div>
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/30 via-transparent to-transparent animate-pulse-intense"></div>
    </div>
  );
};
