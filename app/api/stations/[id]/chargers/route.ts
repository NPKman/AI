import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface StationDetailRow {
  station_id: number;
  ec_id: string | null;
  station_name: string;
  province_name_th: string | null;
  province_name_en: string | null;
  station_type: string | null;
  charger_point_name: string;
  ip_address: string;
  server_url: string | null;
  server_url2: string | null;
  online: number | null;
  heartbeat_timestamp: string | null;
  charger_point_model: string | null;
  firmware_version: string | null;
  ocpp_version: string | null;
  connector_count: number | null;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const stationId = Number(params.id);
  if (Number.isNaN(stationId)) {
    return NextResponse.json({ message: 'รหัสสถานีไม่ถูกต้อง' }, { status: 400 });
  }

  const sql = `
    SELECT
      s.station_id,
      s.ax_cost_center AS ec_id,
      COALESCE(s.station_name_th, s.station_name_en, s.station_name) AS station_name,
      p.province_name_th,
      p.province_name_en,
      COALESCE(st.name_th, st.name_en) AS station_type,
      cl.charger_point_name,
      cl.ip_address,
      cl.server_url,
      cl.server_url2,
      cl.online,
      cl.heartbeat_timestamp,
      cl.charger_point_model,
      cl.firmware_version,
      c.ocpp_version,
      cl.connector_count
    FROM charger_list AS cl
    INNER JOIN charger AS c ON cl.charger_id = c.charger_id
    INNER JOIN station AS s ON c.station_id = s.station_id
    INNER JOIN province AS p ON p.province_id = s.province_id
    INNER JOIN station_type AS st ON s.station_type = st.station_type_id
    WHERE s.station_id = ?
    ORDER BY cl.charger_point_name
  `;

  const rows = await query<StationDetailRow>(sql, [stationId]);
  if (!rows.length) {
    return NextResponse.json({ message: 'ไม่พบสถานีนี้' }, { status: 404 });
  }

  const station = {
    stationId: rows[0].station_id,
    ecId: rows[0].ec_id,
    name: rows[0].station_name,
    provinceTh: rows[0].province_name_th,
    provinceEn: rows[0].province_name_en,
    stationType: rows[0].station_type,
    chargerCount: rows.length
  };

  const chargers = rows.map((row, index) => ({
    chargerId: index,
    chargerPointName: row.charger_point_name,
    ipAddress: row.ip_address,
    serverUrl1: row.server_url,
    serverUrl2: row.server_url2,
    status: row.online === 1 ? 'ONLINE' : row.online === 0 ? 'OFFLINE' : 'UNKNOWN',
    lastTime: row.heartbeat_timestamp,
    model: row.charger_point_model,
    firmware: row.firmware_version,
    ocppVersion: row.ocpp_version,
    connectorCount: row.connector_count
  }));

  return NextResponse.json({ station, chargers });
}
