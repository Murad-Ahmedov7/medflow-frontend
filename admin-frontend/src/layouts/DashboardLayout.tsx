import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logoIcon from '../assets/branding/medflow_logo_only.png';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Stethoscope, Calendar, Building2,
  Pill, FileText, CreditCard, LogOut, Menu, X,
  Bell, ChevronDown, UserPlus, List, MessageCircle, Truck, Package, Wallet, MessageSquareMore,
  ShoppingCart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/useAuth';
import { useChatHub } from '../hooks/useChatHub';
import { useStockHub } from '../hooks/useStockHub';
import { useMedicineOrderHub } from '../hooks/useMedicineOrderHub';
import { useBalanceHub } from '../hooks/useBalanceHub';
import { useMedicineOrderPaymentStore } from '../store/medicineOrderPaymentStore';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';

const COLLAPSE_KEY = 'medflow_admin_sidebar_collapsed';

// Topbar and sidebar header share this height so the logo row and topbar form one visual band.
const BAR_H = 'h-16';

type NavChild = { to: string; icon: React.ElementType; labelKey: string };
type NavItem = {
  to: string; icon: React.ElementType; labelKey: string; end?: boolean;
  children?: NavChild[];
};
type NavGroup = { labelKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    labelKey: 'nav.groups.overview',
    items: [
      { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard', end: true },
    ],
  },
  {
    labelKey: 'nav.groups.people',
    items: [
      { to: '/patients', icon: Users, labelKey: 'nav.patients' },
      {
        to: '/doctors', icon: Stethoscope, labelKey: 'nav.doctors',
        children: [
          { to: '/doctors', icon: List, labelKey: 'nav.doctorsList' },
          { to: '/doctors/create', icon: UserPlus, labelKey: 'nav.doctorsCreate' },
        ],
      },
    ],
  },
  {
    labelKey: 'nav.groups.operations',
    items: [
      { to: '/appointments', icon: Calendar, labelKey: 'nav.appointments' },
      { to: '/chat', icon: MessageCircle, labelKey: 'nav.chat' },
      { to: '/feedback', icon: MessageSquareMore, labelKey: 'nav.feedback' },
      { to: '/departments', icon: Building2, labelKey: 'nav.departments' },
    ],
  },
  {
    labelKey: 'nav.groups.clinical',
    items: [
      { to: '/medicines', icon: Pill, labelKey: 'nav.medicines' },
      { to: '/suppliers', icon: Truck, labelKey: 'nav.suppliers' },
      { to: '/stock', icon: Package, labelKey: 'nav.hospitalStock' },
      { to: '/prescriptions', icon: FileText, labelKey: 'nav.prescriptions' },
      { to: '/medicine-orders', icon: ShoppingCart, labelKey: 'nav.medicineOrders' },
    ],
  },
  {
    labelKey: 'nav.groups.finance',
    items: [
      { to: '/finance', icon: Wallet, labelKey: 'nav.finance' },
    ],
  },
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
            collapsed ? 'w-10 h-10 justify-center mx-auto' : 'gap-3 px-3 py-2.5',
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

function NavItemWithChildren({ item, collapsed, onClose }: {
  item: NavItem; collapsed: boolean; onClose?: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const label = t(item.labelKey);
  const tooltip = useTooltip();

  // Determine if any child is active — keep submenu open automatically
  const anyChildActive = item.children?.some((c) => location.pathname === c.to || location.pathname.startsWith(c.to + '/')) ?? false;
  const [open, setOpen] = useState(anyChildActive);

  // Re-open when navigating to a child from elsewhere
  useEffect(() => {
    if (anyChildActive) setOpen(true);
  }, [anyChildActive]);

  // Close submenu immediately when sidebar collapses so expanded content
  // never occupies layout space inside the narrow 64px sidebar.
  useEffect(() => {
    if (collapsed) setOpen(false);
  }, [collapsed]);

  if (collapsed) {
    // In collapsed mode: show parent icon with tooltip for the group label only
    return (
      <>
        <button
          ref={tooltip.ref as React.Ref<HTMLButtonElement>}
          onMouseEnter={tooltip.show}
          onMouseLeave={tooltip.hide}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-10 h-10 items-center justify-center rounded-md mx-auto transition-colors duration-100',
            anyChildActive
              ? 'bg-slate-100 text-cyan-600 dark:bg-slate-800 dark:text-cyan-400'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800/60',
          )}
        >
          <item.icon size={17} className="shrink-0" />
        </button>
        <SidebarTooltip label={label} anchorRef={tooltip.ref} visible={tooltip.visible} />
      </>
    );
  }

  return (
    <div>
      {/* Parent row — clicking toggles submenu */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-100',
          anyChildActive
            ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60',
        )}
      >
        <item.icon
          size={17}
          className={cn(
            'shrink-0 transition-colors duration-100',
            anyChildActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-slate-500',
          )}
        />
        <span className="flex-1 truncate text-left">{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          className="shrink-0 text-slate-400"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      {/* Children */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
              {item.children?.map((child) => (
                <NavLink
                  key={child.to}
                  to={child.to}
                  end={child.to === item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-100',
                      isActive
                        ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400 font-medium'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <child.icon size={14} className={cn('shrink-0', isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400')} />
                      <span className="truncate">{t(child.labelKey)}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarBottomItem({ collapsed, label, icon: Icon, onClick, danger, to }: {
  collapsed: boolean; label: string; icon: React.ElementType;
  onClick?: () => void; danger?: boolean; to?: string;
}) {
  const tooltip = useTooltip();
  const itemClass = cn(
    'flex items-center rounded-md text-sm font-medium transition-colors duration-100',
    collapsed ? 'w-10 h-10 justify-center mx-auto' : 'gap-3 px-3 py-2.5',
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
              collapsed ? 'w-10 h-10 justify-center mx-auto' : 'gap-3 px-3 py-2.5',
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
          className={itemClass}
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
    <div className="flex h-full w-full flex-col overflow-x-hidden">
      {/* Brand row — same height as topbar so they form one visual band */}
      <div className={cn(
        BAR_H,
        'flex items-center border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden',
        collapsed ? 'justify-center px-0' : 'px-5',
      )}>
        <img src={logoIcon} alt="MedFlow" className="h-9 w-9 object-contain shrink-0" />
        {!collapsed && (
          <div className="ml-3 min-w-0 overflow-hidden">
            <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 leading-none block truncate">MedFlow</span>
            <span className="text-[13px] text-slate-400 dark:text-slate-500 leading-none block mt-1 truncate">Admin Portal</span>
          </div>
        )}
      </div>

      {/* Nav groups */}
      <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden py-4', collapsed ? 'px-0 space-y-4' : 'px-3 space-y-5')}>
        {navGroups.map((group) => (
          <div key={group.labelKey}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-600">
                {t(group.labelKey)}
              </p>
            )}
            {collapsed && <div className="h-px mx-2 mb-2 bg-slate-100 dark:bg-slate-800 first:hidden" />}
            <div className="space-y-0.5">
              {group.items.map((item) =>
                item.children ? (
                  <NavItemWithChildren key={item.to} item={item} collapsed={collapsed} onClose={onClose} />
                ) : (
                  <NavItem key={item.to} {...item} collapsed={collapsed} onClick={onClose} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn(
        'border-t border-slate-100 dark:border-slate-800 py-3 space-y-0.5 shrink-0',
        collapsed ? 'px-0' : 'px-3',
      )}>
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

  // Keep SignalR connected for the entire authenticated session so
  // NewMessage events arrive regardless of which page the admin is on.
  useChatHub(user?.id);
  // Stock hub: real-time hospital stock + medicines updates across all admin tabs.
  useStockHub();
  // Medicine order hub: live notifications for new patient medicine orders.
  useMedicineOrderHub();
  // Balance hub: live Finance dashboard refresh on any admin/hospital balance change.
  // On a medicine-order payment specifically, stash it so FinancePage can show the
  // success modal if (and only if) the admin happens to be on that page right now.
  useBalanceHub(useMedicineOrderPaymentStore.getState().setPendingPayment);

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden" style={{ overflowX: 'clip' }}>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ type: 'tween', duration: 0.22, ease: 'easeInOut' }}
        style={{ willChange: 'width' }}
        className="hidden lg:flex shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-hidden min-w-0"
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
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">

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
              <Menu size={19} />
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

          <div className="flex items-center gap-1.5 pr-4">
            <button className="relative flex items-center justify-center h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            
            </button>

            <LanguageSwitcher />
            <ThemeSwitcher />

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            <div className="flex items-center gap-2 select-none">
              <span className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {(user?.fullName?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}
                </span>
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{user?.email}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
