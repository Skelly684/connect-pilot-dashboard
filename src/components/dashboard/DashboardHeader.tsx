
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, User, X, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/contexts/NotificationsContext";
import { formatDistance } from "date-fns";
import { useTheme } from "next-themes";
import React from "react";
import { useNavigate } from "react-router-dom";

export const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAllNotifications } = useNotifications();
  const { theme, setTheme } = useTheme();
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  console.log('🎨 DashboardHeader render - notifications:', notifications.length, 'unread:', unreadCount);
  console.log('🎨 DashboardHeader notifications detail:', notifications);

  // Listen for notification updates
  React.useEffect(() => {
    const handleNotificationUpdate = (event: CustomEvent) => {
      console.log('🔔 DashboardHeader: Received notifications-updated event', event.detail);
      setForceUpdate(prev => prev + 1); // Force re-render
    };
    
    window.addEventListener('notifications-updated', handleNotificationUpdate as EventListener);
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationUpdate as EventListener);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/");
  };

  const userInitials = user?.email ? 
    user.email.split('@')[0].substring(0, 2).toUpperCase() : 
    'UN';

  const isSpecialUser = user?.email === 'scttskelly@gmail.com';

  return (
    <header className="h-16 bg-gradient-card backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-6 sticky top-0 z-50 shadow-md">
      <div className="flex items-center space-x-4">
        <div className="relative w-14 h-14">
          {isSpecialUser && (
            <div className="absolute -inset-1 bg-purple-500/30 opacity-60 blur-lg -z-10"></div>
          )}
          <img 
            src={isSpecialUser ? "/assets/leadm8-logo.png" : "/assets/psn-logo.png"}
            alt={isSpecialUser ? "LeadM8 Logo" : "PSN Logo"}
            className={`w-full h-full rounded-xl ${isSpecialUser ? '' : 'shadow-sm'} transition-transform duration-300 hover:scale-110 relative z-10`}
            style={isSpecialUser ? { objectFit: 'contain', objectPosition: 'center' } : {}}
          />
          {!isSpecialUser && (
            <div className="absolute -inset-0.5 bg-gradient-primary rounded-xl opacity-20 blur-sm"></div>
          )}
        </div>
        <div className="hidden md:block">
          <h1 className={`text-lg font-semibold ${isSpecialUser ? 'font-russo italic bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text text-transparent animate-pulse tracking-wider transform -skew-x-6 text-xl' : 'text-foreground'}`}>
            {isSpecialUser ? 'NEXUS' : 'PSN Dashboard'}
          </h1>
          <p className="text-xs text-muted-foreground">Lead Management System</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-9 w-9 rounded-xl hover:bg-muted/50 transition-all duration-300 hover:scale-105"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-all duration-300 hover:scale-105">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-primary rounded-full text-xs text-white flex items-center justify-center animate-pulse shadow-primary">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl" align="end">
            <DropdownMenuLabel className="flex items-center justify-between p-4">
              <span className="font-semibold">Notifications</span>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs hover:bg-muted/50 rounded-lg transition-all duration-300"
                >
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-border/30 last:border-b-0 hover:bg-muted/30 transition-all duration-300 ${
                      !notification.read ? 'bg-accent/20 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistance(notification.timestamp, new Date(), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs px-2 py-1 rounded-lg hover:bg-muted/50 transition-all duration-300"
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNotification(notification.id)}
                          className="text-xs px-1 py-1 rounded-lg hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-all duration-300 hover:scale-105">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/avatars/01.png" alt="User" />
                <AvatarFallback className="bg-gradient-primary text-white font-medium text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal p-4">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="rounded-lg mx-2 my-1 hover:bg-muted/50 transition-all duration-300">
              <User className="mr-3 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="rounded-lg mx-2 my-1 hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
