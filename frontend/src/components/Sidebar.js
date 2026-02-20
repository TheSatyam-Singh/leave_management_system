import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Calendar, BarChart3, Briefcase,
  LogOut, ChevronDown, Users, Settings, Menu, X
} from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isManager = user?.role === "manager";
  const basePath = isManager ? "/manager" : "/dashboard";

  const navItems = isManager
    ? [
        { icon: LayoutDashboard, label: "Overview", path: "/manager" },
      ]
    : [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      ];

  const isActive = (path) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF6B00] rounded-sm flex items-center justify-center">
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>B</span>
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">Balance</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {isManager ? "Manager" : "Employee"}
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.path}
            data-testid={`nav-${item.label.toLowerCase()}`}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-all ${
              isActive(item.path)
                ? "bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-white/5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm hover:bg-white/5 transition-all" data-testid="user-menu-trigger">
              <div className="w-8 h-8 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-sm flex items-center justify-center">
                <span className="text-[#FF6B00] text-xs font-bold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs text-white font-medium truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-500 capitalize" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{user?.role}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#16181D] border-white/10 w-52" align="end" side="top">
            <DropdownMenuItem className="text-slate-400 text-xs focus:bg-white/5 focus:text-white cursor-default">
              {user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              data-testid="logout-btn"
              onClick={handleLogout}
              className="text-[#EF4444] text-xs focus:bg-[#EF4444]/10 focus:text-[#EF4444] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        data-testid="mobile-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 bg-[#16181D] border border-white/10 rounded-sm flex items-center justify-center text-white"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-[#0A0B0E] border-r border-white/5 z-50 md:hidden transform transition-transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-[#0A0B0E] border-r border-white/5 z-40 flex-col" data-testid="sidebar">
        <SidebarContent />
      </aside>
    </>
  );
}
