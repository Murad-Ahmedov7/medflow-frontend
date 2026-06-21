import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu, X, ChevronDown, User, Settings,
  FileText, LogOut, Stethoscope, CalendarDays,
  Wallet, Plus,
} from 'lucide-react';
import logoIcon from '../assets/branding/medflow_logo_only.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/useAuth';
import { useMyPatientProfile } from '../hooks/usePatientProfile';
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import axiosInstance from '../api/axiosInstance';
import type { ApiResult } from '../types/api.types';

interface WalletBalanceData { balance: number; }

function useWalletBalance() {
  const { isAuthenticated } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['patient-wallet-balance'],
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResult<WalletBalanceData>>(
        API_ENDPOINTS.wallet.balance,
      );
      return res.data.data ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  return data?.balance ?? 0;
}

const navLinks = [
  { to: '/', labelKey: 'nav.home', end: true },
  { to: '/about', labelKey: 'nav.about' },
  { to: '/doctors', labelKey: 'nav.doctors' },

  { to: '/contact', labelKey: 'nav.contact' },
  { to: '/feedback', labelKey: 'nav.feedback' },
];

// ─── Profile dropdown ─────────────────────────────────────────────────────────
function ProfileDropdown({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: profile } = useMyPatientProfile();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const walletBalance = useWalletBalance();

  const avatarUrl = profile?.profileImageUrl ? `${API_BASE_URL}${profile.profileImageUrl}` : null;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const menuItems = [
    { icon: User,         labelKey: 'profile.myProfile',     to: '/profile' as string | null },
    { icon: CalendarDays, labelKey: 'nav.myAppointments',    to: '/appointments' as string | null },
    { icon: FileText,     labelKey: 'profile.healthRecords', to: '/health-records' as string | null },
    { icon: Settings,     labelKey: 'profile.settings',      to: '/settings' as string | null },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl transition-all duration-150',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          open && 'bg-slate-100 dark:bg-slate-800',
        )}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img src={avatarUrl} alt={user?.fullName} className="h-7 w-7 rounded-lg object-cover shrink-0 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
        ) : (
          <div className="h-7 w-7 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-white text-[10px] font-bold shadow-sm">
            {initials}
          </div>
        )}
        {/* Name — hidden on small desktops, shown at lg+ */}
        <span className="hidden lg:block text-sm font-medium text-slate-700 dark:text-slate-200 max-w-32 truncate">
          {user?.fullName ?? t('auth.signOut')}
        </span>
        <ChevronDown
          size={13}
          className={cn(
            'text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute right-0 top-full mt-2 w-64 z-50',
              'rounded-2xl border border-slate-200/80 dark:border-slate-700/80',
              'bg-white dark:bg-slate-900',
              'shadow-xl shadow-slate-200/60 dark:shadow-black/30',
              'overflow-hidden',
            )}
          >
            {/* User header */}
            <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.fullName} className="h-10 w-10 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-sm">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {user?.fullName ?? '—'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                  {user?.email ?? '—'}
                </p>
              </div>
            </div>

            {/* Wallet balance + Patient badge row */}
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/40">
                <Stethoscope size={11} className="text-cyan-600 dark:text-cyan-400" />
                <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide">
                  {t('auth.patientPortal')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
                <Wallet size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  ₼{walletBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {/* Add Funds — navigates to /wallet */}
              <button
                onClick={() => { setOpen(false); navigate('/wallet'); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100',
                  'text-emerald-600 dark:text-emerald-400',
                  'hover:bg-emerald-50 dark:hover:bg-emerald-900/15',
                  'hover:text-emerald-700 dark:hover:text-emerald-300',
                )}
              >
                <Plus size={15} className="shrink-0" />
                {t('wallet.addFunds')}
              </button>

              <div className="mx-4 my-1 h-px bg-slate-100 dark:bg-slate-800" />

              {menuItems.map(({ icon: Icon, labelKey, to }) => {
                const cls = cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100',
                  'text-slate-600 dark:text-slate-300',
                  'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  'hover:text-slate-900 dark:hover:text-slate-100',
                );
                return to ? (
                  <Link key={labelKey} to={to} onClick={() => setOpen(false)} className={cls}>
                    <Icon size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    {t(labelKey)}
                  </Link>
                ) : (
                  <button key={labelKey} onClick={() => setOpen(false)} className={cls}>
                    <Icon size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>

            {/* Sign out */}
            <div className="border-t border-slate-100 dark:border-slate-800 py-1.5">
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100',
                  'text-red-500 dark:text-red-400',
                  'hover:bg-red-50 dark:hover:bg-red-900/15',
                )}
              >
                <LogOut size={15} className="shrink-0" />
                {t('auth.signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const logout = useLogout();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
      scrolled
        ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200/80 dark:border-slate-800'
        : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-transparent'
    )}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={logoIcon} alt="MedFlow" className="h-8 w-8 object-contain" />
            <span className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">MedFlow</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navLinks.map(({ to, labelKey, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn(
                  'relative px-4 py-2 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )}
              >
                {({ isActive }) => (
                  <>
                    {t(labelKey)}
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-4 right-4 h-px bg-cyan-500"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center gap-0.5">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-1 ml-1">
                <ProfileDropdown onLogout={logout} />
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <button
                  onClick={() => navigate('/sign-in')}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-2 transition-colors"
                >
                  {t('auth.signIn')}
                </button>
                <button
                  onClick={() => navigate('/sign-up')}
                  className="text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-md transition-colors"
                >
                  {t('auth.signUp')}
                </button>
              </div>
            )}

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden ml-1 flex items-center justify-center h-9 w-9 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 space-y-0.5">
              {navLinks.map(({ to, labelKey, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'text-slate-900 bg-slate-50 dark:text-slate-100 dark:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  )}
                >
                  {t(labelKey)}
                </NavLink>
              ))}

              <div className="pt-3 pb-1 border-t border-slate-100 dark:border-slate-800">
                {isAuthenticated ? (
                  <MobileUserRow
                    onLogout={() => { logout(); setMobileOpen(false); }}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <LanguageSwitcher />
                      <ThemeSwitcher />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { navigate('/sign-in'); setMobileOpen(false); }}
                        className="text-sm font-medium text-slate-600 dark:text-slate-400 px-3 py-1.5"
                      >
                        {t('auth.signIn')}
                      </button>
                      <button
                        onClick={() => { navigate('/sign-up'); setMobileOpen(false); }}
                        className="text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 px-4 py-1.5 rounded-md transition-colors"
                      >
                        {t('auth.signUp')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Mobile authenticated user row ───────────────────────────────────────────
function MobileUserRow({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: profile } = useMyPatientProfile();
  const navigate = useNavigate();
  const walletBalance = useWalletBalance();

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const avatarUrl = profile?.profileImageUrl ? `${API_BASE_URL}${profile.profileImageUrl}` : null;

  const menuItems = [
    { icon: User,         labelKey: 'profile.myProfile',     to: '/profile' as string | null },
    { icon: CalendarDays, labelKey: 'nav.myAppointments',    to: '/appointments' as string | null },
    { icon: FileText,     labelKey: 'profile.healthRecords', to: '/health-records' as string | null },
    { icon: Settings,     labelKey: 'profile.settings',      to: '/settings' as string | null },
  ];

  return (
    <div className="space-y-1">
      {/* Identity + wallet balance */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
        {avatarUrl ? (
          <img src={avatarUrl} alt={user?.fullName} className="h-9 w-9 rounded-lg object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700" />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{user?.fullName ?? '—'}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email ?? '—'}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40">
            <Wallet size={10} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
              ₼{walletBalance.toFixed(2)}
            </span>
          </div>
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </div>

      {/* Add Funds — navigates to /wallet */}
      <button
        onClick={() => navigate('/wallet')}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/15 transition-colors"
      >
        <Plus size={15} className="shrink-0" />
        {t('wallet.addFunds')}
      </button>

      {/* Menu items */}
      {menuItems.map(({ icon: Icon, labelKey, to }) => {
        const cls = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors';
        return to ? (
          <Link key={labelKey} to={to} className={cls}>
            <Icon size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
            {t(labelKey)}
          </Link>
        ) : (
          <button key={labelKey} className={cls}>
            <Icon size={15} className="text-slate-400 dark:text-slate-500 shrink-0" />
            {t(labelKey)}
          </button>
        );
      })}

      {/* Sign out */}
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 transition-colors"
      >
        <LogOut size={15} className="shrink-0" />
        {t('auth.signOut')}
      </button>
    </div>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="MedFlow" className="h-6 w-6 object-contain brightness-0 invert opacity-80" />
            <span className="text-[14px] font-semibold text-slate-300">MedFlow</span>
          </div>
          <p className="text-[13px] text-slate-500 text-center">{t('footer.tagline')}</p>
          <p className="text-[12px] text-slate-600">© {new Date().getFullYear()} MedFlow. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}

export function WebsiteLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
