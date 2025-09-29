'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StationCard } from '@/components/stations/station-card';
import { stationSearchSchema } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = stationSearchSchema.extend({
  q: z.string().optional(),
  province: z.string().optional(),
  stationType: z.string().optional(),
  status: z.enum(['ONLINE', 'OFFLINE']).optional()
});

type StationFilters = z.infer<typeof formSchema>;

async function fetchStations(filters: StationFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.province) params.set('province', filters.province);
  if (filters.stationType) params.set('stationType', filters.stationType);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 9));

  const res = await fetch(`/api/stations?${params.toString()}`);
  if (!res.ok) {
    throw new Error('ไม่สามารถโหลดข้อมูลสถานีได้');
  }
  return res.json();
}

export default function StationsPage() {
  const { push } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const form = useForm<StationFilters>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      q: '',
      province: '',
      stationType: '',
      status: undefined,
      page,
      pageSize
    }
  });

  const filters = form.watch();
  const mergedFilters = useMemo(() => ({ ...filters, page, pageSize }), [filters, page, pageSize]);

  const query = useQuery({
    queryKey: ['stations', mergedFilters],
    queryFn: () => fetchStations(mergedFilters),
    keepPreviousData: true,
    onError(error) {
      push({ title: 'เกิดข้อผิดพลาด', description: String(error), intent: 'error' });
    }
  });

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSubmit = form.handleSubmit(() => {
    setPage(1);
    query.refetch();
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-2xl font-semibold text-slate-900">รายการสถานี</h2>
        <p className="text-sm text-muted-foreground">
          ค้นหาสถานีด้วยชื่อ จังหวัด ประเภท หรือกรองตามสถานะ Online/Offline
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border bg-white p-4 shadow-sm md:grid-cols-5">
          <div className="md:col-span-2">
            <Label htmlFor="q">ค้นหาสถานี</Label>
            <Input id="q" placeholder="ชื่อสถานี" {...form.register('q')} />
          </div>
          <div>
            <Label htmlFor="province">จังหวัด</Label>
            <Input id="province" placeholder="จังหวัด" {...form.register('province')} />
          </div>
          <div>
            <Label htmlFor="stationType">ประเภทสถานี</Label>
            <Input id="stationType" placeholder="เช่น Highway" {...form.register('stationType')} />
          </div>
          <div>
            <Label>สถานะชาร์จเจอร์</Label>
            <Select
              value={filters.status ?? 'ALL'}
              onValueChange={(value) =>
                form.setValue(
                  'status',
                  value === 'ALL' ? undefined : (value as 'ONLINE' | 'OFFLINE'),
                  { shouldDirty: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทั้งหมด</SelectItem>
                <SelectItem value="ONLINE">Online</SelectItem>
                <SelectItem value="OFFLINE">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button type="submit" disabled={query.isFetching}>
              {query.isFetching ? 'กำลังค้นหา...' : 'ค้นหา'}
            </Button>
          </div>
        </form>
      </section>

      {query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="h-52 w-full" />
          ))}
        </div>
      ) : query.data?.data?.length ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {query.data.data.map((station: any) => (
              <StationCard key={station.stationId} {...station} />
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-white p-4">
            <p className="text-sm text-muted-foreground">
              หน้า {page} จาก {totalPages} ({total} สถานี)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1 || query.isFetching}
              >
                ก่อนหน้า
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || query.isFetching}
              >
                ถัดไป
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-muted-foreground">
          ไม่พบสถานีตามเงื่อนไขที่เลือก ลองเปลี่ยนคำค้นหาหรือฟิลเตอร์ใหม่
        </div>
      )}
    </div>
  );
}
