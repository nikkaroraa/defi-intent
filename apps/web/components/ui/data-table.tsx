import { type ReactNode } from 'react';

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

export function DataTableHeader({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border text-left text-sm text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

interface DataTableRowProps {
  children: ReactNode;
  highlight?: boolean;
  className?: string;
}

export function DataTableRow({
  children,
  highlight = false,
  className = '',
}: DataTableRowProps) {
  return (
    <tr
      className={`border-b border-border/50 hover:bg-accent/50 transition-colors ${
        highlight ? 'bg-primary/5' : ''
      } ${className}`}
    >
      {children}
    </tr>
  );
}
