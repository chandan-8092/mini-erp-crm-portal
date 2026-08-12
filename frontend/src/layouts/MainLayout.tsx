import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  ArrowLeftRight,
  FileText,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import { Role } from '../types';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  allowedRoles: Role[];
}

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigationItems: SidebarItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      name: 'Customers CRM',
      path: '/customers',
      icon: Users,
      allowedRoles: ['ADMIN', 'SALES', 'ACCOUNTS'],
    },
    {
      name: 'Products & Inventory',
      path: '/products',
      icon: Package,
      allowedRoles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
    {
      name: 'Stock Movements',
      path: '/stock-movements',
      icon: ArrowLeftRight,
      allowedRoles: ['ADMIN', 'WAREHOUSE'],
    },
    {
      name: 'Sales Challans',
      path: '/challans',
      icon: FileText,
      allowedRoles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-rose-950/40 text-rose-400 border-rose-800/40';
      case 'SALES':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
      case 'WAREHOUSE':
        return 'bg-amber-950/40 text-amber-400 border-amber-800/40';
      case 'ACCOUNTS':
        return 'bg-sky-950/40 text-sky-400 border-sky-800/40';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700/50';
    }
  };

  const filteredNavigation = navigationItems.filter(
    (item) => user && item.allowedRoles.includes(user.role)
  );

  return (
    <div className="min-h-screen text-slate-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800/60 sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-indigo-500" />
          <span className="font-bold text-lg tracking-wider text-slate-200 uppercase">Mini ERP + CRM</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-slate-100 focus:outline-none"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar - Desktop & Mobile overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 brushed-sidebar flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Section */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/70 bg-slate-950/20">
            <ShieldCheck className="h-7 w-7 text-indigo-400" />
            <span className="font-extrabold text-sm tracking-wider text-slate-200 uppercase">Operations Portal</span>
          </div>

          {/* User Info Section */}
          {user && (
            <div className="mx-4 my-5 p-4 rounded-xl sunken-well flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-sm">
                <UserIcon className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm truncate text-slate-100">{user.name}</p>
                <div className="mt-1 flex items-center">
                  <span className={`px-2.5 py-0.5 text-[9px] font-black tracking-wider uppercase rounded border ${getRoleBadgeColor(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-3 space-y-1.5">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-100 group ${
                    isActive
                      ? 'sunken-well text-indigo-400 border-l-2 border-l-indigo-500 shadow-inner'
                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-transform ${
                      isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                  {isActive && (
                    <span className="ml-auto led-glow led-blue" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout Button */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-xs font-bold text-rose-400 hover:text-white bg-rose-950/15 border border-rose-900/30 hover:bg-rose-900/25 rounded-lg transition-all duration-100 shadow-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        ></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-transparent overflow-x-hidden min-h-screen">
        {/* Top Navbar */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-slate-950/20 border-b border-slate-800/60 sticky top-0 z-30 backdrop-blur-md">
          <div>
            <h1 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full led-glow led-green"></span>
              {location.pathname.split('/')[1]?.replace('-', ' ') || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase bg-slate-950/40 px-3 py-1 rounded border border-slate-800/50 shadow-inner">
              System Active &bull; {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Page Outlet */}
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
