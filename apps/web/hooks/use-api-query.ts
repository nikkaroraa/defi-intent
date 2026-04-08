'use client';

import { useQuery } from '@tanstack/react-query';

interface UseApiQueryOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useApiQuery<T>(
  key: string[],
  url: string,
  options?: UseApiQueryOptions
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });
}
