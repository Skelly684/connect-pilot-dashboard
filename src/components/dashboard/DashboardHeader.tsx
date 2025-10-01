
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
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistance } from "date-fns";
import { useTheme } from "next-themes";

export const DashboardHeader = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
  };

  const userInitials = user?.email ? 
    user.email.split('@')[0].substring(0, 2).toUpperCase() : 
    'UN';

  return (
    <header className="relative h-20 bg-gradient-card backdrop-blur-2xl border-b border-border/50 flex items-center justify-between px-8 sticky top-0 z-40 shadow-xl">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30 pointer-events-none"></div>
      
      <div className="relative flex items-center space-x-6">
        <div className="relative group">
          <div className="absolute -inset-1.5 bg-gradient-primary rounded-2xl opacity-75 group-hover:opacity-100 blur-lg transition-all duration-500 animate-pulse"></div>
          <img 
            src="/assets/psn-logo.png" 
            alt="PSN Logo" 
            className="relative w-11 h-11 rounded-2xl shadow-glow transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
          />
        </div>
        <div className="hidden md:block">
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">PSN Dashboard</h1>
          <p className="text-sm text-muted-foreground font-medium">Lead Management System</p>
        </div>
      </div>
      
      <div className="relative flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="relative h-11 w-11 rounded-2xl hover:bg-primary/10 transition-all duration-500 hover:scale-110 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
          <Sun className="relative h-5 w-5 rotate-0 scale-100 transition-all duration-500 dark:-rotate-90 dark:scale-0 text-primary" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-500 dark:rotate-0 dark:scale-100 text-primary" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-11 w-11 rounded-2xl hover:bg-primary/10 transition-all duration-500 hover:scale-110 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
              <Bell className="relative h-5 w-5 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-6 w-6 bg-gradient-accent rounded-full text-xs text-white flex items-center justify-center animate-pulse shadow-glow font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl z-[100]" align="end">
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
            <Button variant="ghost" className="relative h-12 w-12 rounded-2xl hover:bg-primary/10 transition-all duration-500 hover:scale-110 p-0 group">
              <div className="absolute -inset-1 bg-gradient-primary rounded-2xl opacity-0 group-hover:opacity-75 blur-md transition-all duration-500"></div>
              <Avatar className="relative h-11 w-11 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-500">
                <AvatarImage src="/avatars/01.png" alt="User" />
                <AvatarFallback className="bg-gradient-primary text-white font-bold text-base">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover/95 backdrop-blur-xl border-border/50 shadow-xl z-[100]" align="end" forceMount>
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
