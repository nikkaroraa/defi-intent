import { type ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'chain';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-800 text-gray-300 border-gray-700',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  chain: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const variant = risk === 'low' ? 'success' : risk === 'medium' ? 'warning' : 'danger';
  return <Badge variant={variant}>{risk}</Badge>;
}

export function ChainBadge({ chain }: { chain: string }) {
  return <Badge variant="chain">{chain}</Badge>;
}
