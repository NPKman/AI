'use client';

import { Badge } from '@/components/ui/badge';

export function StatusBadge({ status }: { status: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN' }) {
  const mapping: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    ONLINE: { label: 'ONLINE', variant: 'default' },
    OFFLINE: { label: 'OFFLINE', variant: 'secondary' },
    FAULT: { label: 'FAULT', variant: 'destructive' },
    UNKNOWN: { label: 'UNKNOWN', variant: 'outline' }
  };

  const meta = mapping[status] ?? mapping.UNKNOWN;
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}
