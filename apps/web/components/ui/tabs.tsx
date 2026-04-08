'use client';

import { type ReactNode, createContext, useContext, useState } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue>({
  activeTab: '',
  setActiveTab: () => {},
});

export function Tabs({
  defaultValue,
  children,
  className = '',
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex gap-1 p-1 bg-card rounded-lg border border-border ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`
        px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
        ${
          isActive
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return <div className={`mt-4 ${className}`}>{children}</div>;
}
