'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChargerCard } from '@/components/chargers/charger-card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FIRMWARE_CONFIG, type FirmwareOption } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { formatBangkok } from '@/lib/time';

interface StationResponse {
  station: {
    stationId: number;
    ecId: string | null;
    name: string;
    provinceTh: string | null;
    provinceEn: string | null;
    stationType: string | null;
    chargerCount: number;
  };
  chargers: ChargerItem[];
}

interface ChargerItem {
  chargerId: number;
  chargerPointName: string;
  ipAddress: string;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN';
  lastTime: string | null;
  model: string | null;
  firmware: string | null;
  ocppVersion: string | null;
  connectorCount: number | null;
  serverUrl1: string | null;
  serverUrl2: string | null;
}

async function fetchStationDetail(id: string) {
  const res = await fetch(`/api/stations/${id}/chargers`);
  if (!res.ok) {
    throw new Error('ไม่สามารถโหลดข้อมูลสถานีได้');
  }
  return res.json() as Promise<StationResponse>;
}

export default function StationDetailPage() {
  const params = useParams<{ id: string }>();
  const stationId = params.id;
  const { push } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['station-detail', stationId],
    queryFn: () => fetchStationDetail(stationId),
    enabled: Boolean(stationId)
  });

  const [chargers, setChargers] = useState<ChargerItem[]>([]);

  const latestHeartbeat = useMemo(() => {
    if (!chargers.length) return null;
    const timestamps = chargers
      .map((item) => (item.lastTime ? new Date(item.lastTime).getTime() : null))
      .filter((value): value is number => Boolean(value));
    if (!timestamps.length) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [chargers]);

  useEffect(() => {
    if (data?.chargers) {
      setChargers(data.chargers);
    }
  }, [data?.chargers]);

  useEffect(() => {
    if (!stationId) return;
    let active = true;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;
    const source = new EventSource(`/api/stream/chargers?stationId=${stationId}`);
    source.onmessage = (event) => {
      if (!active) return;
      const parsed = JSON.parse(event.data) as { chargers: Partial<ChargerItem>[] };
      setChargers((prev) => {
        const map = new Map(prev.map((item) => [item.ipAddress, item]));
        parsed.chargers.forEach((charger) => {
          if (!charger.ipAddress) return;
          const existing = map.get(charger.ipAddress);
          if (existing) {
            map.set(charger.ipAddress, { ...existing, ...charger } as ChargerItem);
          } else {
            map.set(charger.ipAddress, {
              chargerId: Date.now(),
              chargerPointName: charger.chargerPointName ?? charger.ipAddress,
              ipAddress: charger.ipAddress,
              status: charger.status ?? 'UNKNOWN',
              lastTime: charger.lastTime ?? null,
              model: charger.model ?? null,
              firmware: charger.firmware ?? null,
              ocppVersion: charger.ocppVersion ?? null,
              connectorCount: charger.connectorCount ?? null,
              serverUrl1: charger.serverUrl1 ?? null,
              serverUrl2: charger.serverUrl2 ?? null
            });
          }
        });
        return Array.from(map.values());
      });
    };
    source.onerror = () => {
      if (!fallbackInterval) {
        fallbackInterval = setInterval(() => {
          refetch();
        }, 60000);
      }
    };
    return () => {
      active = false;
      source.close();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [stationId, refetch]);

  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [firmwareOption, setFirmwareOption] = useState<FirmwareOption | ''>('');
  const [firmwareFile, setFirmwareFile] = useState('');
  const [isFirmwareOpen, setFirmwareOpen] = useState(false);
  const [isConfigOpen, setConfigOpen] = useState(false);
  const [isRebootOpen, setRebootOpen] = useState(false);
  const [configJson, setConfigJson] = useState('{\n  "charger": {\n    "ipaddress": ""\n  }\n}');
  const [rebootStep, setRebootStep] = useState(1);
  const [isSubmitting, setSubmitting] = useState(false);

  const firmwareFiles = useMemo(() => {
    return firmwareOption ? FIRMWARE_CONFIG[firmwareOption] : [];
  }, [firmwareOption]);

  const openFirmwareModal = (ip: string) => {
    setSelectedIp(ip);
    setFirmwareOpen(true);
    setFirmwareOption('');
    setFirmwareFile('');
  };

  const openConfigModal = (ip: string) => {
    setSelectedIp(ip);
    setConfigOpen(true);
    setConfigJson(JSON.stringify({ charger: { ipaddress: ip } }, null, 2));
  };

  const openRebootModal = (ip: string) => {
    setSelectedIp(ip);
    setRebootOpen(true);
    setRebootStep(1);
  };

  const handleFirmwareSubmit = async () => {
    if (!selectedIp || !firmwareOption || !firmwareFile) {
      push({ title: 'กรุณาเลือกข้อมูลให้ครบ', intent: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_firmware',
          ip: selectedIp,
          option: firmwareOption,
          firmwareKey: firmwareFile
        })
      });
      if (!res.ok) throw new Error('ส่งคำสั่งไม่สำเร็จ');
      push({ title: 'ส่งคำสั่งสำเร็จ', description: 'เริ่มอัปเดตเฟิร์มแวร์แล้ว', intent: 'success' });
      setFirmwareOpen(false);
    } catch (error) {
      push({ title: 'เกิดข้อผิดพลาด', description: String(error), intent: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigSubmit = async () => {
    if (!selectedIp) return;
    try {
      const parsed = JSON.parse(configJson);
      setSubmitting(true);
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'custom_config', ip: selectedIp, payload: parsed })
      });
      if (!res.ok) throw new Error('ส่งคำสั่งไม่สำเร็จ');
      push({ title: 'ส่งคำสั่งสำเร็จ', description: 'บันทึกการตั้งค่าแล้ว', intent: 'success' });
      setConfigOpen(false);
    } catch (error) {
      if (error instanceof SyntaxError) {
        push({ title: 'JSON ไม่ถูกต้อง', description: 'ตรวจสอบรูปแบบ JSON อีกครั้ง', intent: 'error' });
      } else {
        push({ title: 'เกิดข้อผิดพลาด', description: String(error), intent: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReboot = async () => {
    if (!selectedIp) return;
    if (rebootStep === 1) {
      setRebootStep(2);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'soft_reset', ip: selectedIp })
      });
      if (!res.ok) throw new Error('ส่งคำสั่งไม่สำเร็จ');
      push({ title: 'สั่งรีบูตแล้ว', description: 'ชาร์จเจอร์กำลังรีสตาร์ต', intent: 'success' });
      setRebootOpen(false);
    } catch (error) {
      push({ title: 'เกิดข้อผิดพลาด', description: String(error), intent: 'error' });
    } finally {
      setSubmitting(false);
      setRebootStep(1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{data?.station.name ?? 'สถานี'}</h2>
          <p className="text-sm text-muted-foreground">
            ประเภท: {data?.station.stationType ?? '-'} • จังหวัด: {data?.station.provinceTh ?? '-'} • ชาร์จเจอร์ {chargers.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            รีเฟรช
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 text-sm text-muted-foreground sm:grid-cols-4">
          <div>
            <p className="font-medium text-slate-700">EC_ID</p>
            <p>{data?.station.ecId ?? '-'}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">จังหวัด (EN)</p>
            <p>{data?.station.provinceEn ?? '-'}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">ปรับปรุงล่าสุด</p>
            <p>{formatBangkok(latestHeartbeat)}</p>
          </div>
          <div>
            <p className="font-medium text-slate-700">จำนวนชาร์จเจอร์</p>
            <p>{chargers.length}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {chargers.map((charger) => (
          <ChargerCard
            key={charger.ipAddress}
            {...charger}
            onUpdateFirmware={openFirmwareModal}
            onCustomConfig={openConfigModal}
            onReboot={openRebootModal}
          />
        ))}
      </div>

      <Dialog open={isFirmwareOpen} onOpenChange={setFirmwareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Firmware</DialogTitle>
            <DialogDescription>เลือกชุดเฟิร์มแวร์และยืนยันเพื่อส่งคำสั่งไปยังชาร์จเจอร์</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>หมวดเฟิร์มแวร์</Label>
              <Select
                value={firmwareOption}
                onValueChange={(value) => {
                  setFirmwareOption(value as FirmwareOption);
                  setFirmwareFile('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกหมวด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="194kw">194kw</SelectItem>
                  <SelectItem value="300kw">300kw</SelectItem>
                  <SelectItem value="360kw">360kw</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ไฟล์เฟิร์มแวร์</Label>
              <Select value={firmwareFile} onValueChange={setFirmwareFile} disabled={!firmwareOption}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกไฟล์" />
                </SelectTrigger>
                <SelectContent>
                  {firmwareFiles.map((file) => (
                    <SelectItem key={file} value={file}>
                      {file}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFirmwareOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button onClick={handleFirmwareSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'กำลังส่ง...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConfigOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Custom Config</DialogTitle>
            <DialogDescription>วาง JSON ที่ต้องการส่งไปยัง RabbitMQ โดยระบบจะไม่ปรับแก้ใด ๆ</DialogDescription>
          </DialogHeader>
          <Textarea value={configJson} onChange={(event) => setConfigJson(event.target.value)} spellCheck={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfigSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'กำลังส่ง...' : 'ยืนยัน'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRebootOpen} onOpenChange={setRebootOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reboot Charger</DialogTitle>
            <DialogDescription>
              {rebootStep === 1
                ? 'ยืนยันขั้นที่ 1: ตรวจสอบให้แน่ใจว่าไม่มีรถเชื่อมต่ออยู่'
                : 'ขั้นที่ 2: ยืนยันอีกครั้งเพื่อสั่ง Soft Reset'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRebootOpen(false)} disabled={isSubmitting}>
              ยกเลิก
            </Button>
            <Button variant={rebootStep === 2 ? 'destructive' : 'default'} onClick={handleReboot} disabled={isSubmitting}>
              {rebootStep === 1 ? 'ยืนยันขั้นที่ 1' : isSubmitting ? 'กำลังส่ง...' : 'ยืนยันรีบูต'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
