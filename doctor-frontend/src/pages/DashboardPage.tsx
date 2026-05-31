import { useTranslation } from 'react-i18next';
import {
  Calendar, CheckCircle2, Clock, User, Stethoscope,
  BadgeCheck, DollarSign, Building2, Activity,
} from 'lucide-react';
import { useDoctorProfile, useTodayAppointments } from '../hooks/useDoctorProfile';
import { Spinner } from '../components/ui/Spinner';
import { cn } from '../utils/cn';
import type { TodayAppointmentResponse } from '../types/appointment.types';

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useDoctorProfile();
  const { data: todayAppointments = [], isLoading: apptLoading } = useTodayAppointments();

  const waiting = todayAppointments.filter((a) => a.status === 'Waiting').length;
  const inProgress = todayAppointments.filter((a) => a.status === 'InProgress').length;
  const completed = todayAppointments.filter((a) => a.status === 'Completed').length;

  return (
    <div className="space-y-6">
      {/* Welcome row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('nav.dashboard')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('dashboard.welcomeDoctor')},{' '}
            <span className="font-semibold text-cyan-600">
              {profileLoading ? '…' : (profile?.fullName ?? '—')}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Clock size={14} />
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label={t('dashboard.todayTotal')}
          value={apptLoading ? null : todayAppointments.length}
          icon={<Calendar size={18} />}
          color="cyan"
        />
        <StatCard
          label={t('dashboard.waiting')}
          value={apptLoading ? null : waiting}
          icon={<Clock size={18} />}
          color="amber"
        />
        <StatCard
          label={t('dashboard.inProgress')}
          value={apptLoading ? null : inProgress}
          icon={<Activity size={18} />}
          color="blue"
        />
        <StatCard
          label={t('dashboard.completed')}
          value={apptLoading ? null : completed}
          icon={<CheckCircle2 size={18} />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments list */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-cyan-600" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('dashboard.todaySchedule')}
              </h2>
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {apptLoading ? '…' : `${todayAppointments.length} ${t('dashboard.appointments')}`}
            </span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/60">
            {apptLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400 dark:text-slate-500">
                {t('dashboard.noAppointmentsToday')}
              </div>
            ) : (
              todayAppointments.map((appt) => (
                <AppointmentRow key={appt.id} appointment={appt} />
              ))
            )}
          </div>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <User size={16} className="text-cyan-600" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('dashboard.myProfile')}
            </h2>
          </div>
          {profileLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : !profile ? (
            <div className="py-8 text-center text-sm text-slate-400">{t('common.noData')}</div>
          ) : (
            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex justify-center">
                {profile.imageUrl ? (
                  <img
                    src={profile.imageUrl}
                    alt={profile.fullName}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-cyan-100 dark:ring-cyan-900"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {profile.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{profile.fullName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{profile.email}</p>
              </div>

              <div className="space-y-2.5">
                <ProfileRow icon={<Stethoscope size={14} />} label={t('dashboard.specialty')} value={profile.specialty} />
                <ProfileRow icon={<Building2 size={14} />} label={t('dashboard.department')} value={profile.departmentName} />
                <ProfileRow icon={<Clock size={14} />} label={t('dashboard.experience')} value={`${profile.yearsOfExperience} ${t('dashboard.years')}`} />
                <ProfileRow icon={<DollarSign size={14} />} label={t('dashboard.fee')} value={`$${profile.consultationFee.toFixed(2)}`} />
                {profile.licenseNumber && (
                  <ProfileRow icon={<BadgeCheck size={14} />} label={t('dashboard.license')} value={profile.licenseNumber} />
                )}
              </div>

              {profile.about && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{profile.about}</p>
                </div>
              )}

              {/* Active status badge */}
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
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: 'cyan' | 'amber' | 'blue' | 'green';
}) {
  const colorMap = {
    cyan:  { bg: 'bg-cyan-50 dark:bg-cyan-900/20',  icon: 'text-cyan-600 dark:text-cyan-400',  num: 'text-cyan-700 dark:text-cyan-300' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600 dark:text-amber-400', num: 'text-amber-700 dark:text-amber-300' },
    blue:  { bg: 'bg-blue-50 dark:bg-blue-900/20',   icon: 'text-blue-600 dark:text-blue-400',   num: 'text-blue-700 dark:text-blue-300' },
    green: { bg: 'bg-green-50 dark:bg-green-900/20', icon: 'text-green-600 dark:text-green-400', num: 'text-green-700 dark:text-green-300' },
  };
  const c = colorMap[color];

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between">
        <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl', c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
      </div>
      <div className="mt-3">
        {value === null ? (
          <div className="h-7 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
        ) : (
          <p className={cn('text-2xl font-bold', c.num)}>{value}</p>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: TodayAppointmentResponse }) {
  const { t } = useTranslation();

  const statusStyles: Record<string, string> = {
    Waiting:    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    InProgress: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Completed:  'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  const statusLabels: Record<string, string> = {
    Waiting:    t('dashboard.status.waiting'),
    InProgress: t('dashboard.status.inProgress'),
    Completed:  t('dashboard.status.completed'),
  };

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
        {appointment.queueNumber}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{appointment.patientFullName}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {appointment.startTime} – {appointment.endTime}
          {' · '}
          <span className="capitalize">{appointment.appointmentType === 'FirstVisit' ? t('dashboard.firstVisit') : t('dashboard.followUp')}</span>
        </p>
      </div>
      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', statusStyles[appointment.status])}>
        {statusLabels[appointment.status] ?? appointment.status}
      </span>
    </div>
  );
}

function ProfileRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}
