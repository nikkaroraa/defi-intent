import { type ReactNode } from 'react';

interface StatProps {
  label: string;
  value: string | ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function Stat({
  label,
  value,
  change,
  changeType = 'neutral',
  icon,
  className = '',
}: StatProps) {
  const changeColor =
    changeType === 'positive'
      ? 'text-emerald-400'
      : changeType === 'negative'
      ? 'text-red-400'
      : 'text-gray-400';

  return (
    <div
      className={`bg-card border border-border rounded-xl p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {change && (
        <div className={`text-sm mt-1 ${changeColor}`}>{change}</div>
      )}
    </div>
  );
}

export function StatGrid({
  children,
  cols = 4,
  className = '',
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 ${colsClass[cols]} ${className}`}>
      {children}
    </div>
  );
}
