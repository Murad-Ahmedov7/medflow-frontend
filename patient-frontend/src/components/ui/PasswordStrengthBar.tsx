import { useTranslation } from 'react-i18next';

interface Props {
  password: string;
}

type Strength = 'weak' | 'medium' | 'strong' | null;

function getChecks(pw: string) {
  return {
    long:       pw.length >= 8,
    hasUpper:   /[A-Z]/.test(pw),
    hasLower:   /[a-z]/.test(pw),
    hasDigit:   /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };
}

function getStrength(pw: string): Strength {
  if (!pw) return null;
  const c = getChecks(pw);
  if (!c.long) return 'weak';
  if (c.long && c.hasUpper && c.hasLower && c.hasDigit && c.hasSpecial) return 'strong';
  if (c.long && c.hasUpper && c.hasLower && c.hasDigit) return 'medium';
  return 'weak';
}

const strengthMeta = {
  weak:   { labelKey: 'auth.passwordStrength.weak',   bars: 1, color: 'bg-red-500',    text: 'text-red-500' },
  medium: { labelKey: 'auth.passwordStrength.medium', bars: 2, color: 'bg-yellow-500', text: 'text-yellow-600' },
  strong: { labelKey: 'auth.passwordStrength.strong', bars: 3, color: 'bg-green-500',  text: 'text-green-600' },
};

const requirementKeys: { check: keyof ReturnType<typeof getChecks>; labelKey: string }[] = [
  { check: 'long',       labelKey: 'auth.passwordReq.minLength' },
  { check: 'hasUpper',   labelKey: 'auth.passwordReq.uppercase' },
  { check: 'hasLower',   labelKey: 'auth.passwordReq.lowercase' },
  { check: 'hasDigit',   labelKey: 'auth.passwordReq.number' },
  { check: 'hasSpecial', labelKey: 'auth.passwordReq.special' },
];

export function PasswordStrengthBar({ password }: Props) {
  const { t } = useTranslation();
  const strength = getStrength(password);
  if (!strength) return null;

  const { labelKey, bars, color, text } = strengthMeta[strength];
  const checks = getChecks(password);

  return (
    <div className="mt-2 space-y-2">
      {/* Bars */}
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= bars ? color : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>

      {/* Strength label */}
      <p className={`text-xs font-semibold ${text}`}>{t(labelKey)} {t('auth.passwordStrength.label')}</p>

      {/* Requirements checklist */}
      <ul className="space-y-0.5">
        {requirementKeys.map(({ check, labelKey: reqKey }) => {
          const met = checks[check];
          return (
            <li key={check} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className="text-[10px]">{met ? '✓' : '○'}</span>
              {t(reqKey)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
