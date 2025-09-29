'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ModelChart } from '@/components/dashboard/model-chart';
import { ModelTable } from '@/components/dashboard/model-table';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { dashboardFilterSchema } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';

const formSchema = dashboardFilterSchema.extend({
  province: z.string().optional(),
  stationType: z.string().optional()
});

type DashboardFilters = z.infer<typeof formSchema>;

async function fetchDashboard(filters: DashboardFilters) {
  const params = new URLSearchParams();
  params.set('period', filters.period);
  if (filters.province) params.set('province', filters.province);
  if (filters.stationType) params.set('stationType', filters.stationType);
  const res = await fetch(`/api/dashboard?${params.toString()}`);
  if (!res.ok) {
    throw new Error('ไม่สามารถโหลดข้อมูลแดชบอร์ดได้');
  }
  return res.json();
}

export default function DashboardPage() {
  const { push } = useToast();
  const form = useForm<DashboardFilters>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      period: '24h',
      province: '',
      stationType: ''
    }
  });

  const filters = form.watch();

  const query = useQuery({
    queryKey: ['dashboard', filters],
    queryFn: () => fetchDashboard(filters),
    refetchInterval: 60000,
    onError(error) {
      push({ title: 'โหลดข้อมูลล้มเหลว', description: String(error), intent: 'error' });
    }
  });

  const { data } = query;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-900">แดชบอร์ดภาพรวม</h2>
        <p className="text-sm text-muted-foreground">
          สรุปสถานะชาร์จเจอร์ตามช่วงเวลาที่เลือกและกรองตามจังหวัดหรือประเภทสถานี
        </p>
        <form
          onSubmit={form.handleSubmit(() => query.refetch())}
          className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-4"
        >
          <div className="space-y-2">
            <Label htmlFor="period">ช่วงเวลา</Label>
            <Select
              value={filters.period}
              onValueChange={(value) => form.setValue('period', value as DashboardFilters['period'], { shouldDirty: true })}
            >
              <SelectTrigger id="period">
                <SelectValue placeholder="เลือกช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 ชั่วโมงล่าสุด</SelectItem>
                <SelectItem value="7d">7 วันล่าสุด</SelectItem>
                <SelectItem value="30d">30 วันล่าสุด</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">จังหวัด</Label>
            <Input
              id="province"
              placeholder="เช่น กรุงเทพมหานคร"
              {...form.register('province')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stationType">ประเภทสถานี</Label>
            <Input id="stationType" placeholder="DC / AC" {...form.register('stationType')} />
          </div>
          <div className="flex items-end justify-end">
            <Button type="submit" disabled={query.isFetching} className="w-full md:w-auto">
              {query.isFetching ? 'กำลังโหลด...' : 'รีเฟรชข้อมูล'}
            </Button>
          </div>
        </form>
      </section>

      <SummaryCards online={data?.totalOnline ?? 0} offline={data?.totalOffline ?? 0} fault={data?.totalFault ?? 0} />

      <div className="grid gap-6 md:grid-cols-2">
        <ModelChart models={data?.models ?? []} />
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-slate-800">คำอธิบาย</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Online = 1, Offline = 0, ส่วนค่าที่เหลือจัดเป็น Fault/Unknown เพื่อให้เห็นความผิดปกติได้ง่าย
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              ระบบจะรีเฟรชข้อมูลอัตโนมัติทุก 60 วินาทีและสามารถกดปุ่ม "รีเฟรชข้อมูล" เพื่อดึงข้อมูลทันทีได้
            </p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-900">ตารางสรุปตามรุ่นชาร์จเจอร์</h3>
        <ModelTable models={data?.models ?? []} />
      </section>
    </div>
  );
}
