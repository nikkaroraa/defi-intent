import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'gradient';
  padding?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  default: 'bg-card border border-border',
  glass: 'bg-card/40 backdrop-blur-xl border border-border/40',
  gradient: 'bg-gradient-to-br from-card/80 to-secondary/40 border border-border/30',
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`rounded-xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-lg font-semibold text-card-foreground ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-sm text-muted-foreground mt-1 ${className}`}>{children}</p>
  );
}
