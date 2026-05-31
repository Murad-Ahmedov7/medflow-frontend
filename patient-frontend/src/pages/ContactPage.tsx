import { useTranslation } from 'react-i18next';
import { MapPin, Phone, Mail } from 'lucide-react';

export function ContactPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{t('nav.contact')}</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-12">We're here to help. Reach out anytime.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: MapPin, title: 'Address', value: '123 Medical Center Dr, Baku, AZ 1000' },
          { icon: Phone, title: 'Phone', value: '+994 12 345 67 89' },
          { icon: Mail, title: 'Email', value: 'contact@medflow.az' },
        ].map(({ icon: Icon, title, value }) => (
          <div key={title} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 flex items-start gap-4">
            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center">
              <Icon size={18} className="text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">{title}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
