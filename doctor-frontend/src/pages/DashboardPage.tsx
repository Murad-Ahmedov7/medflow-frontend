import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Calendar, CheckCircle2, Clock, User, Stethoscope,
  BadgeCheck, DollarSign, Building2, Activity,
  ArrowRight, XCircle,
} from 'lucide-react';
import { useDoctorProfile, useTodayAppointments } from '../hooks/useDoctorProfile';
import { cn } from '../utils/cn';
import { API_BASE_URL } from '../api/config';
import type { TodayAppointmentResponse } from '../types/appointment.types';

// ── Avatar helper ─────────────────────────────────────────────────────────────

function avatarFromId(id: string) {
  const n = (parseInt(id.replace(/-/g, '').slice(0, 8), 16) % 70) + 1;
  const g = parseInt(id.replace(/-/g, '').slice(8, 10), 16) % 2 === 0 ? 'men' : 'women';
  return `https://randomuser.me/api/portraits/${g}/${n}.jpg`;
}

function fmtTime(t: string) { return t?.slice(0, 5) ?? ''; }

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { badge: string; dot: string }> = {
  Waiting:    { badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  dot: 'bg-amber-500' },
  InProgress: { badge: 'bg-blue-50  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',   dot: 'bg-blue-500' },
  Completed:  { badge: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',  dot: 'bg-green-500' },
  Cancelled:  { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-700   dark:text-slate-400',  dot: 'bg-slate-400' },
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const STAT_COLORS = {
  cyan:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20',    icon: 'text-cyan-600 dark:text-cyan-400',    num: 'text-cyan-700 dark:text-cyan-300' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: 'text-amber-600 dark:text-amber-400',  num: 'text-amber-700 dark:text-amber-300' },
  blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',    icon: 'text-blue-600 dark:text-blue-400',    num: 'text-blue-700 dark:text-blue-300' },
  green:  { bg: 'bg-green-50 dark:bg-green-900/20',  icon: 'text-green-600 dark:text-green-400',  num: 'text-green-700 dark:text-green-300' },
  slate:  { bg: 'bg-slate-100 dark:bg-slate-700/50', icon: 'text-slate-500 dark:text-slate-400',  num: 'text-slate-600 dark:text-slate-300' },
};

function StatCard({
  label, value, icon, color, delay = 0,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: keyof typeof STAT_COLORS;
  delay?: number;
}) {
  const c = STAT_COLORS[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 p-4"
    >
      <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl', c.bg)}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className="mt-3">
        {value === null ? (
          <div className="h-7 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        ) : (
          <p className={cn('text-2xl font-bold tabular-nums', c.num)}>{value}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Appointment row ───────────────────────────────────────────────────────────

function AppointmentRow({ appt, index }: { appt: TodayAppointmentResponse; index: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cfg = STATUS_CFG[appt.status] ?? STATUS_CFG.Waiting;
  const avatar = avatarFromId(appt.patientId);

  const statusLabel: Record<string, string> = {
    Waiting:    t('dashboard.status.waiting'),
    InProgress: t('dashboard.status.inProgress'),
    Completed:  t('dashboard.status.completed'),
    Cancelled:  t('dashboard.status.cancelled'),
  };

  const canOpen = appt.status === 'InProgress' || appt.status === 'Completed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
      className={cn(
        'flex items-center gap-4 px-5 py-3.5 group',
        canOpen
          ? 'hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors'
          : 'opacity-80',
      )}
      onClick={() => canOpen && navigate(`/examinations/${appt.id}`)}
    >
      {/* Patient avatar */}
      <img
        src={avatar}
        alt={appt.patientFullName}
        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-600"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
      />

      {/* Time slot + name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {appt.patientFullName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={10} className="text-slate-400 shrink-0" />
          <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {fmtTime(appt.startTime)} – {fmtTime(appt.endTime)}
          </span>
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {appt.appointmentType === 'FirstVisit' ? t('dashboard.firstVisit') : t('dashboard.followUp')}
          </span>
        </div>
      </div>

      {/* Status badge */}
      <span className={cn('shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium', cfg.badge)}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
        {statusLabel[appt.status] ?? appt.status}
      </span>

      {/* Arrow for navigable rows */}
      {canOpen && (
        <ArrowRight
          size={14}
          className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors"
        />
      )}
    </motion.div>
  );
}

// ── Schedule skeleton ─────────────────────────────────────────────────────────

function ScheduleSkeleton() {
  return (
    <div className="divide-y divide-slate-50 dark:divide-slate-700/60">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-2.5 w-48 rounded bg-slate-100 dark:bg-slate-700/60" />
          </div>
          <div className="h-5 w-16 rounded-full bg-slate-100 dark:bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

// ── Profile row ───────────────────────────────────────────────────────────────

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Profile card skeleton ─────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="space-y-2 text-center">
        <div className="h-4 w-32 mx-auto rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-3 w-40 mx-auto rounded bg-slate-100 dark:bg-slate-700/60" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 mt-1" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-700/60" />
            <div className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Next appointment widget ───────────────────────────────────────────────────

function NextAppointmentWidget({ appointments }: { appointments: TodayAppointmentResponse[] }) {
  const { t } = useTranslation();

  const next = appointments
    .filter(a => a.status === 'Waiting')
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.28, ease: 'easeOut' }}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
        <Clock size={15} className="text-cyan-600" />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.nextAppointment')}</h2>
      </div>

      {next ? (
        <div className="p-5 flex items-center gap-4">
          <img
            src={avatarFromId(next.patientId)}
            alt={next.patientFullName}
            className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-600"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{next.patientFullName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {fmtTime(next.startTime)} – {fmtTime(next.endTime)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{t('dashboard.status.waiting')}</span>
          </div>
        </div>
      ) : (
        <div className="px-5 py-7 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 size={24} className="text-green-400 dark:text-green-500" />
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('dashboard.noUpcoming')}</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useDoctorProfile();
  const { data: todayAppts = [], isLoading: apptLoading } = useTodayAppointments();

  const waiting    = todayAppts.filter(a => a.status === 'Waiting').length;
  const inProgress = todayAppts.filter(a => a.status === 'InProgress').length;
  const completed  = todayAppts.filter(a => a.status === 'Completed').length;
  const cancelled  = todayAppts.filter(a => a.status === 'Cancelled').length;

  return (
    <div className="space-y-6">

      {/* ── Welcome header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('dashboard.welcomeDoctor')}{' '}
            <span className="text-cyan-600 dark:text-cyan-400">
              {profileLoading ? '…' : (profile?.fullName ?? '—')}
            </span>
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Today count chip */}
        {!apptLoading && todayAppts.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/50">
            <Calendar size={13} className="text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
              {todayAppts.length} {t('dashboard.appointments')}
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label={t('dashboard.waiting')}    value={apptLoading ? null : waiting}    icon={<Clock size={18} />}        color="amber"  delay={0.05} />
        <StatCard label={t('dashboard.inProgress')} value={apptLoading ? null : inProgress} icon={<Activity size={18} />}     color="blue"   delay={0.1} />
        <StatCard label={t('dashboard.completed')}  value={apptLoading ? null : completed}  icon={<CheckCircle2 size={18} />} color="green"  delay={0.15} />
        <StatCard label={t('dashboard.cancelled')}  value={apptLoading ? null : cancelled}  icon={<XCircle size={18} />}      color="slate"  delay={0.2} />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's schedule — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
          className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-cyan-600" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.todaySchedule')}</h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {!apptLoading && `${todayAppts.length} ${t('dashboard.appointments')}`}
            </span>
          </div>

          {apptLoading ? (
            <ScheduleSkeleton />
          ) : todayAppts.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/50">
                <Calendar size={24} className="text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500">{t('dashboard.noAppointmentsToday')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/60">
              {todayAppts.map((appt, i) => (
                <AppointmentRow key={appt.id} appt={appt} index={i} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Right column: next appt + profile */}
        <div className="space-y-5">

          {/* Next appointment */}
          {!apptLoading && <NextAppointmentWidget appointments={todayAppts} />}

          {/* Doctor profile card */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.35, ease: 'easeOut' }}
            className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
              <User size={15} className="text-cyan-600" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('dashboard.myProfile')}</h2>
            </div>

            {profileLoading ? (
              <ProfileSkeleton />
            ) : !profile ? (
              <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{t('common.noData')}</div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Avatar */}
                <div className="flex justify-center">
                  {profile.imageUrl ? (
                    <img
                      src={profile.imageUrl.startsWith('http') ? profile.imageUrl : `${API_BASE_URL}${profile.imageUrl}`}
                      alt={profile.fullName}
                      className="w-18 h-18 rounded-full object-cover ring-2 ring-cyan-100 dark:ring-cyan-900"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                      {profile.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{profile.fullName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{profile.email}</p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <ProfileRow icon={<Stethoscope size={13} />} label={t('dashboard.specialty')}   value={profile.specialty} />
                  <ProfileRow icon={<Building2 size={13} />}   label={t('dashboard.department')}  value={profile.departmentName} />
                  <ProfileRow icon={<Clock size={13} />}       label={t('dashboard.experience')}  value={`${profile.yearsOfExperience} ${t('dashboard.years')}`} />
                  <ProfileRow icon={<DollarSign size={13} />}  label={t('dashboard.fee')}         value={`$${profile.consultationFee.toFixed(2)}`} />
                  {profile.licenseNumber && (
                    <ProfileRow icon={<BadgeCheck size={13} />} label={t('dashboard.license')} value={profile.licenseNumber} />
                  )}
                </div>

                {profile.about && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">{profile.about}</p>
                  </div>
                )}

                <div className="flex justify-center pt-1">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    profile.isActive
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', profile.isActive ? 'bg-green-500' : 'bg-slate-400')} />
                    {profile.isActive ? t('dashboard.active') : t('dashboard.inactive')}
                  </span>
                </div>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
