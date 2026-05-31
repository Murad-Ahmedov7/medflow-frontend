import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet } from 'react-router-dom';
import logoIcon from '../assets/branding/medflow_logo_only.png';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Calendar, Users, FileText, Pill,
  Settings, LogOut, Menu, X, Bell, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/useAuth';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

const COLLAPSE_KEY = 'medflow_doctor_sidebar_collapsed';

// Topbar and sidebar header share this height so the logo row and topbar form one visual band.
const BAR_H = 'h-14';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
  { to: '/appointments', icon: Calendar, labelKey: 'nav.appointments' },
  { to: '/patients', icon: Users, labelKey: 'nav.patients' },
  { to: '/prescriptions', icon: FileText, labelKey: 'nav.prescriptions' },
  { to: '/medicines', icon: Pill, labelKey: 'nav.medicines' },
];

// Renders into document.body to escape overflow:hidden on the sidebar.
function SidebarTooltip({ label, anchorRef, visible }: {
  label: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  visible: boolean;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (visible && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 10 });
    }
  }, [visible, anchorRef]);

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.12 }}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-9999 pointer-events-none -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 dark:bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function useTooltip() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  return { ref, visible, show, hide };
}

function NavItem({ to, icon: Icon, labelKey, end, collapsed, onClick }: {
  to: string; icon: React.ElementType; labelKey: string; end?: boolean;
  collapsed: boolean; onClick?: () => void;
}) {
  const { t } = useTranslation();
  const label = t(labelKey);
  const tooltip = useTooltip();

  return (
    <>
      <NavLink
        to={to}
        end={end}
        onClick={onClick}
        ref={collapsed ? (tooltip.ref as React.Ref<HTMLAnchorElement>) : undefined}
        onMouseEnter={collapsed ? tooltip.show : undefined}
        onMouseLeave={collapsed ? tooltip.hide : undefined}
        className={({ isActive }) =>
          cn(
            'flex items-center rounded-md text-sm font-medium transition-colors duration-100',
            collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
            isActive
              ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60'
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={17} className={cn('shrink-0 transition-colors duration-100', isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500')} />
            {!collapsed && <span className="truncate">{label}</span>}
          </>
        )}
      </NavLink>
      {collapsed && <SidebarTooltip label={label} anchorRef={tooltip.ref} visible={tooltip.visible} />}
    </>
  );
}

function SidebarBottomItem({ collapsed, label, icon: Icon, onClick, danger, to }: {
  collapsed: boolean; label: string; icon: React.ElementType;
  onClick?: () => void; danger?: boolean; to?: string;
}) {
  const tooltip = useTooltip();
  const itemClass = cn(
    'flex items-center rounded-md text-sm font-medium transition-colors duration-100',
    collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
    danger
      ? 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20'
      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60',
  );
  const sharedProps = {
    onMouseEnter: collapsed ? tooltip.show : undefined,
    onMouseLeave: collapsed ? tooltip.hide : undefined,
  };

  return (
    <>
      {to ? (
        <NavLink
          to={to}
          ref={collapsed ? (tooltip.ref as React.Ref<HTMLAnchorElement>) : undefined}
          {...sharedProps}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-md text-sm font-medium transition-colors duration-100',
              collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'gap-3 px-3 py-2.5',
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={17} className={cn('shrink-0 transition-colors duration-100', isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500')} />
              {!collapsed && <span>{label}</span>}
            </>
          )}
        </NavLink>
      ) : (
        <button
          onClick={onClick}
          ref={collapsed ? (tooltip.ref as React.Ref<HTMLButtonElement>) : undefined}
          {...sharedProps}
          className={cn('w-full', itemClass)}
        >
          <Icon size={17} className="shrink-0 text-slate-400 transition-colors duration-100" />
          {!collapsed && <span>{label}</span>}
        </button>
      )}
      {collapsed && <SidebarTooltip label={label} anchorRef={tooltip.ref} visible={tooltip.visible} />}
    </>
  );
}

function SidebarNav({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const logout = useLogout();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Brand row — same height as topbar so they form one visual band */}
      <div className={cn(
        BAR_H,
        'flex items-center border-b border-slate-100 dark:border-slate-800 shrink-0',
        collapsed ? 'justify-center px-0' : 'px-4',
      )}>
        {collapsed ? (
          <img src={logoIcon} alt="MedFlow" className="h-8 w-8 object-contain" />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoIcon} alt="MedFlow" className="h-8 w-8 object-contain shrink-0" />
            <div className="min-w-0">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none block truncate">MedFlow</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 leading-none block mt-0.5">Doctor Portal</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-4 space-y-0.5', collapsed ? 'px-0' : 'px-3')}>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onClose} />
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn(
        'border-t border-slate-100 dark:border-slate-800 py-3 space-y-0.5 shrink-0',
        collapsed ? 'px-0' : 'px-3',
      )}>
        <SidebarBottomItem collapsed={collapsed} label={t('nav.settings')} icon={Settings} to="/settings" />
        <SidebarBottomItem collapsed={collapsed} label={t('auth.signOut')} icon={LogOut} onClick={logout} danger />
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });
  const { user } = useAuthStore();

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
        className="hidden lg:flex shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <SidebarNav collapsed={collapsed} />
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden"
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
              className="fixed left-0 top-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 shadow-lg lg:hidden"
            >
              <SidebarNav collapsed={false} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Topbar — same height as sidebar brand row */}
        <header className={cn(
          BAR_H,
          'flex items-center border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0',
        )}>
          {/*
            Toggle button occupies a fixed 64px slot on the left so it lines up
            perfectly with the collapsed sidebar icon column at all times.
          */}
          <div className="flex items-center justify-center w-16 shrink-0">
            {/* Mobile: always show hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            {/* Desktop: hamburger when collapsed, X when expanded */}
            <AnimatePresence initial={false} mode="wait">
              {collapsed ? (
                <motion.button
                  key="open"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: -90 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setCollapsed(false)}
                  className="hidden lg:flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Expand sidebar"
                >
                  <Menu size={18} />
                </motion.button>
              ) : (
                <motion.button
                  key="close"
                  initial={{ opacity: 0, rotate: 90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setCollapsed(true)}
                  className="hidden lg:flex items-center justify-center h-9 w-9 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <X size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5 pr-4">
            <button className="relative flex items-center justify-center h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
              <Bell size={17} />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </button>
            <LanguageSwitcher />
            <ThemeSwitcher />
            <div className="ml-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            <button className="flex items-center gap-2 h-9 pl-2.5 pr-3 rounded-md text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors ml-0.5">
              <span className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {user?.fullName?.[0]?.toUpperCase() ?? 'D'}
                </span>
              </span>
              <span className="hidden sm:block text-sm font-medium max-w-24 truncate">{user?.fullName ?? 'Doctor'}</span>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6"><Outlet /></main>
      </div>
    </div>
  );
}
