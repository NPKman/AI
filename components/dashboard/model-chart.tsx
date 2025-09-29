'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModelChartProps {
  models: Array<{
    model: string;
    online: number;
    offline: number;
    fault: number;
  }>;
}

export function ModelChart({ models }: ModelChartProps) {
  const totals = models.map((model) => model.online + model.offline + model.fault);
  const max = Math.max(1, ...totals);

  return (
    <Card>
      <CardHeader>
        <CardTitle>สถานะตามรุ่นชาร์จเจอร์</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {models.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีข้อมูลสำหรับช่วงเวลานี้</p>
        ) : (
          <div className="space-y-3">
            {models.map((item) => {
              const total = item.online + item.offline + item.fault;
              const onlineWidth = (item.online / max) * 100;
              const offlineWidth = (item.offline / max) * 100;
              const faultWidth = (item.fault / max) * 100;
              return (
                <div key={item.model} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{item.model}</span>
                    <span className="text-xs text-muted-foreground">ทั้งหมด {total} ตัว</span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full border bg-muted">
                    <div
                      className={cn('bg-emerald-500/80 transition-all')}
                      style={{ width: `${onlineWidth}%` }}
                      title={`Online ${item.online}`}
                    />
                    <div
                      className="bg-slate-400/80 transition-all"
                      style={{ width: `${offlineWidth}%` }}
                      title={`Offline ${item.offline}`}
                    />
                    <div
                      className="bg-amber-500/80 transition-all"
                      style={{ width: `${faultWidth}%` }}
                      title={`Fault ${item.fault}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
