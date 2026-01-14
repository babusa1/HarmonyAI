import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  GitCompare,
  BarChart3,
  Upload,
  Database,
  Settings,
  Bell,
  Search,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'HITL Review', href: '/review', icon: GitCompare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Data Upload', href: '/upload', icon: Upload },
  { name: 'Catalog', href: '/catalog', icon: Database },
];

export default function Layout() {
  const location = useLocation();
  
  // Get current page title
  const currentPage = navigation.find(item => item.href === location.pathname);
  
  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-900/50 border-r border-surface-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg tracking-tight">
                HarmonizeIQ
              </h1>
              <p className="text-[10px] text-surface-500 -mt-0.5">Data Harmonization Platform</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/50'
                )}
              >
                <item.icon className={cn(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-brand-400' : 'text-surface-500 group-hover:text-surface-300'
                )} />
                <span>{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>
        
        {/* Bottom section */}
        <div className="p-4 border-t border-surface-800">
          <div className="p-4 rounded-xl bg-gradient-to-br from-brand-900/50 to-accent-violet/10 border border-brand-800/30">
            <p className="text-sm font-medium text-surface-200">Demo Mode</p>
            <p className="text-xs text-surface-400 mt-1">Using synthetic FMCG data</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-brand-400">
              <div className="w-2 h-2 rounded-full bg-accent-mint animate-pulse" />
              <span>System Healthy</span>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-surface-900/30 border-b border-surface-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-surface-500">HarmonizeIQ</span>
            <ChevronRight className="w-4 h-4 text-surface-600" />
            <span className="text-surface-200 font-medium">{currentPage?.name || 'Page'}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-64 pl-10 pr-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-sm
                         placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-surface-800 transition-colors">
              <Bell className="w-5 h-5 text-surface-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-coral" />
            </button>
            
            {/* Settings */}
            <button className="p-2 rounded-lg hover:bg-surface-800 transition-colors">
              <Settings className="w-5 h-5 text-surface-400" />
            </button>
            
            {/* User */}
            <div className="flex items-center gap-3 pl-4 border-l border-surface-700">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-violet flex items-center justify-center">
                <span className="text-white text-sm font-medium">SB</span>
              </div>
              <div className="text-sm">
                <p className="font-medium text-surface-200">Suresh B.</p>
                <p className="text-xs text-surface-500">Admin</p>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
