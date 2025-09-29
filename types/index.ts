export interface Station {
  stationId: number;
  ecId: string | null;
  name: string;
  provinceTh: string | null;
  provinceEn: string | null;
  stationType: string | null;
  chargerCount: number;
}

export interface Charger {
  chargerId: number;
  chargerPointName: string;
  ipAddress: string;
  serverUrl1: string | null;
  serverUrl2: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'FAULT' | 'UNKNOWN';
  lastTime: string | null;
  model: string | null;
  firmware: string | null;
  ocppVersion: string | null;
  connectorCount: number | null;
}

export interface DashboardSummary {
  totalOnline: number;
  totalOffline: number;
  totalFault: number;
  models: Array<{
    model: string;
    online: number;
    offline: number;
    fault: number;
  }>;
}
