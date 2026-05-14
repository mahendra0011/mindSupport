import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Menu, X, BookOpen, Calendar, CalendarClock, Users, BarChart3, Home, Heart, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
const Navigation = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const navItems = [
        { name: "Home", icon: Home, route: "/" },
        ...(user?.role === "user" ? [{ name: "My Wellness", icon: Heart, route: "/wellness" }] : []),
        { name: "Resources", icon: BookOpen, route: "/resources" },
        ...(user?.role === "user" ? [{ name: "Counselling", icon: Calendar, route: "/counselling" }] : []),
        ...(user?.role === "user" ? [{ name: "Session Schedule", icon: CalendarClock, route: "/session-schedule" }] : []),
        ...(user?.role === "user" || user?.role === "admin" ? [{ name: "Peer Support", icon: Users, route: "/peer" }] : []),
        ...(user ? [{ name: "Dashboard", icon: BarChart3, route: "/dashboard" }] : []),
    ];
    const signOut = () => {
        dispatch(logout());
        navigate("/login");
    };
    return (<nav className="glass-nav fixed top-0 w-full z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-gradient-primary glow-primary">
              <Brain className="h-6 w-6 text-primary-foreground"/>
            </div>
            <span className="text-xl font-bold gradient-text">MindSupport</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden xl:block">
            <div className="ml-6 flex items-center gap-2">
              {navItems.map((item) => (<a key={item.name} href={item.route} onClick={(e) => { e.preventDefault(); navigate(item.route); }} className="flex items-center space-x-1 px-2 2xl:px-3 py-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-glass/50 transition-all duration-200 whitespace-nowrap">
                  <item.icon className="h-4 w-4"/>
                  <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
                </a>))}
            </div>
          </div>

          {/* CTAs */}
          <div className="hidden xl:flex items-center ml-auto">
            {user ? (<Button variant="outline" onClick={signOut} className="ml-2 whitespace-nowrap">
                <LogOut className="h-4 w-4 mr-2"/>
                <span className="text-sm font-semibold tracking-wide">Logout</span>
              </Button>) : (<Button variant="outline" onClick={() => navigate("/login")} className="ml-2 whitespace-nowrap">
                <LogIn className="h-4 w-4 mr-2"/>
                <span className="text-sm font-semibold tracking-wide">Login</span>
              </Button>)}
          </div>

          {/* Mobile menu button */}
          <div className="xl:hidden">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(!isOpen)} className="text-foreground">
              {isOpen ? <X className="h-6 w-6"/> : <Menu className="h-6 w-6"/>}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (<div className="xl:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-glass/90 backdrop-blur-xl rounded-lg mt-2 border border-glass-border/30">
              {navItems.map((item) => (<a key={item.name} href={item.route} className="flex items-center space-x-2 block px-3 py-2 rounded-md text-foreground/80 hover:text-foreground hover:bg-glass/50" onClick={(e) => { e.preventDefault(); setIsOpen(false); navigate(item.route); }}>
                  <item.icon className="h-4 w-4"/>
                  <span>{item.name}</span>
                </a>))}
              <div className="pt-2 space-y-2">
                {user ? (<Button onClick={() => { setIsOpen(false); signOut(); }} variant="outline" className="w-full">
                    <LogOut className="h-4 w-4 mr-2"/>
                    <span className="text-sm font-semibold tracking-wide">Logout</span>
                  </Button>) : (<Button onClick={() => { setIsOpen(false); navigate("/login"); }} variant="outline" className="w-full">
                    <LogIn className="h-4 w-4 mr-2"/>
                    <span className="text-sm font-semibold tracking-wide">Login</span>
                  </Button>)}
              </div>
              {/* Auth buttons removed from mobile navigation as requested */}
            </div>
          </div>)}
      </div>
    </nav>);
};
export default Navigation;
