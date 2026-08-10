import Link from 'next/link';
import { Inbox } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { roleLabel, type AppRole } from '@/lib/roles';

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-b border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex min-h-36 w-full max-w-[var(--page-max-width)] flex-col justify-center gap-4 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-6 lg:px-8">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            {description}
          </p>
        </div>
        {action}
      </div>
    </header>
  );
}

export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 h-1 w-8 rounded-full bg-primary-700" />
      <p className="text-sm font-medium text-neutral-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-neutral-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className={`${eyebrow ? 'mt-1' : ''} text-xl font-semibold text-neutral-900`}>
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

const badgeTone = {
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  info: 'bg-info-50 text-info-700',
};

const statusTone: Record<string, keyof typeof badgeTone> = {
  PUBLISHED: 'success',
  SUBMITTED: 'warning',
  RETURNED: 'warning',
  DEACTIVATED: 'error',
  INVITED: 'info',
  DRAFT: 'neutral',
  APPROVED: 'success',
  REJECTED: 'error',
  PENDING: 'warning',
};

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTone;
}) {
  return <span className={`pill ${badgeTone[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const label = status
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
  return <Badge tone={statusTone[status] || 'neutral'}>{label}</Badge>;
}

export function RoleBadge({ role }: { role?: AppRole | null }) {
  const tone =
    role === 'ADMIN' ? 'info' : role === 'LEADER' ? 'success' : 'neutral';
  return <Badge tone={tone}>{roleLabel(role)}</Badge>;
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
}) {
  const styles = {
    primary: 'btn',
    secondary: 'btn-secondary',
    destructive: 'btn-destructive',
    ghost: 'btn-ghost',
  };
  return <button className={`${styles[variant]} ${className}`} {...props} />;
}

export function Empty({
  title,
  body,
  href,
  label,
  icon,
  compact = false,
}: {
  title: string;
  body: string;
  href?: string;
  label?: string;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? 'rounded-panel border border-dashed border-neutral-300 p-6' : 'card p-10'} text-center`}
    >
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-control bg-neutral-100 text-neutral-600">
        {icon || <Inbox size={19} aria-hidden="true" />}
      </div>
      <h3 className="font-semibold text-neutral-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600">{body}</p>
      {href && (
        <Link className="btn-secondary mt-4" href={href}>
          {label}
        </Link>
      )}
    </div>
  );
}
