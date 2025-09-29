'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';
import { formatBangkok } from '@/lib/time';

export interface ChargerCardProps {
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
  onUpdateFirmware: (ip: string) => void;
  onCustomConfig: (ip: string) => void;
  onReboot: (ip: string) => void;
}

export function ChargerCard(props: ChargerCardProps) {
  const {
    chargerPointName,
    ipAddress,
    status,
    lastTime,
    model,
    firmware,
    ocppVersion,
    connectorCount,
    serverUrl1,
    serverUrl2,
    onUpdateFirmware,
    onCustomConfig,
    onReboot
  } = props;

  return (
    <Card className="flex h-full flex-col justify-between border border-slate-200">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900">{chargerPointName}</CardTitle>
          <StatusBadge status={status} />
        </div>
        <div className="text-xs text-muted-foreground">
          IP: <span className="font-mono text-slate-700">{ipAddress}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          อัปเดตล่าสุด: {formatBangkok(lastTime)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground">รุ่น</p>
            <p className="font-medium text-slate-800">{model ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Firmware</p>
            <p className="font-medium text-slate-800">{firmware ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">OCPP</p>
            <p className="font-medium text-slate-800">{ocppVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">หัวชาร์จ</p>
            <p className="font-medium text-slate-800">{connectorCount ?? '-'}</p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground">Server URL 1</p>
          <p className="break-all font-mono text-xs text-slate-700">{serverUrl1 ?? '-'}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Server URL 2</p>
          <p className="break-all font-mono text-xs text-slate-700">{serverUrl2 ?? '-'}</p>
        </div>
        <div className="grid gap-2 pt-2 sm:grid-cols-3">
          <Button variant="outline" size="sm" onClick={() => onUpdateFirmware(ipAddress)}>
            Update Firmware
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCustomConfig(ipAddress)}>
            Custom Config
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onReboot(ipAddress)}>
            Reboot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
