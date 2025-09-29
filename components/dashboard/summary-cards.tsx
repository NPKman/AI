'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, PowerOff, AlertTriangle } from 'lucide-react';

interface SummaryCardsProps {
  online: number;
  offline: number;
  fault: number;
}

export function SummaryCards({ online, offline, fault }: SummaryCardsProps) {
  const items = [
    {
      label: 'ชาร์จเจอร์ Online',
      value: online,
      icon: Battery,
      accent: 'text-emerald-600'
    },
    {
      label: 'ชาร์จเจอร์ Offline',
      value: offline,
      icon: PowerOff,
      accent: 'text-slate-600'
    },
    {
      label: 'แจ้งเตือน Fault',
      value: fault,
      icon: AlertTriangle,
      accent: 'text-amber-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            <item.icon className={`h-5 w-5 ${item.accent}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
