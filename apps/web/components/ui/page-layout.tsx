import { type ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: '3xl' | '7xl';
  className?: string;
}

const maxWidthStyles = {
  '3xl': 'max-w-3xl',
  '7xl': 'max-w-7xl',
};

export function PageLayout({
  children,
  maxWidth = '7xl',
  className = '',
}: PageLayoutProps) {
  return (
    <div className={`flex-1 p-6 ${maxWidthStyles[maxWidth]} mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-2.5">
          {icon}
          {title}
        </h1>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
