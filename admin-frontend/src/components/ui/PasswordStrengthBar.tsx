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

const strengthConfig = {
  weak:   { label: 'Weak',   bars: 1, color: 'bg-red-500',    text: 'text-red-500' },
  medium: { label: 'Medium', bars: 2, color: 'bg-yellow-500', text: 'text-yellow-600' },
  strong: { label: 'Strong', bars: 3, color: 'bg-green-500',  text: 'text-green-600' },
};

const requirements = [
  { key: 'long',       label: 'At least 8 characters' },
  { key: 'hasUpper',   label: 'One uppercase letter (A–Z)' },
  { key: 'hasLower',   label: 'One lowercase letter (a–z)' },
  { key: 'hasDigit',   label: 'One number (0–9)' },
  { key: 'hasSpecial', label: 'One special character (!@#$…)' },
];

export function PasswordStrengthBar({ password }: Props) {
  const strength = getStrength(password);
  if (!strength) return null;

  const { label, bars, color, text } = strengthConfig[strength];
  const checks = getChecks(password);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= bars ? color : 'bg-slate-200 dark:bg-slate-700'}`} />
        ))}
      </div>
      <p className={`text-xs font-semibold ${text}`}>{label} password</p>
      <ul className="space-y-0.5">
        {requirements.map(({ key, label: reqLabel }) => {
          const met = checks[key as keyof typeof checks];
          return (
            <li key={key} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
              <span className="text-[10px]">{met ? '✓' : '○'}</span>
              {reqLabel}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
