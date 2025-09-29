'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StationCardProps {
  stationId: number;
  name: string;
  ecId: string | null;
  provinceTh: string | null;
  stationType: string | null;
  chargerCount: number;
  onlineCount: number;
  offlineCount: number;
}

export function StationCard({
  stationId,
  name,
  ecId,
  provinceTh,
  stationType,
  chargerCount,
  onlineCount,
  offlineCount
}: StationCardProps) {
  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">{name}</CardTitle>
        <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
          {ecId ? <Badge variant="secondary">EC_ID: {ecId}</Badge> : null}
          {stationType ? <Badge variant="outline">{stationType}</Badge> : null}
          {provinceTh ? <span>{provinceTh}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-700">
            <p className="text-xs uppercase tracking-wide">Online</p>
            <p className="text-xl font-semibold">{onlineCount}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 text-slate-700">
            <p className="text-xs uppercase tracking-wide">Offline</p>
            <p className="text-xl font-semibold">{offlineCount}</p>
          </div>
          <div className="rounded-lg bg-sky-50 p-3 text-sky-700">
            <p className="text-xs uppercase tracking-wide">รวม</p>
            <p className="text-xl font-semibold">{chargerCount}</p>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link href={`/stations/${stationId}`}>ดูรายละเอียด</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
