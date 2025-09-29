import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { dashboardFilterSchema } from '@/lib/validators';

interface DashboardRow {
  model: string | null;
  online: number;
  offline: number;
  fault: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = dashboardFilterSchema.parse(params);
  const { period, province, stationType } = parsed;

  const where: string[] = [];
  const whereParams: (string | number)[] = [];

  if (province) {
    where.push('(p.province_name_th = ? OR p.province_name_en = ?)');
    whereParams.push(province, province);
  }

  if (stationType) {
    where.push('(st.name_th = ? OR st.name_en = ?)');
    whereParams.push(stationType, stationType);
  }

  if (period) {
    const interval = period === '24h' ? '1 DAY' : period === '7d' ? '7 DAY' : '30 DAY';
    where.push(
      `cl.heartbeat_timestamp >= DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(), 'UTC', ?), INTERVAL ${interval})`
    );
    whereParams.push('Asia/Bangkok');
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      COALESCE(cl.charger_point_model, 'ไม่ทราบรุ่น') AS model,
      SUM(CASE WHEN cl.online = 1 THEN 1 ELSE 0 END) AS online,
      SUM(CASE WHEN cl.online = 0 THEN 1 ELSE 0 END) AS offline,
      SUM(CASE WHEN cl.online NOT IN (0, 1) THEN 1 ELSE 0 END) AS fault
    FROM charger_list AS cl
    INNER JOIN charger AS c ON cl.charger_id = c.charger_id
    INNER JOIN station AS s ON c.station_id = s.station_id
    INNER JOIN province AS p ON p.province_id = s.province_id
    INNER JOIN station_type AS st ON s.station_type = st.station_type_id
    ${whereClause}
    GROUP BY model
    ORDER BY model
  `;

  const rows = await query<DashboardRow>(sql, whereParams);

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalOnline += row.online;
      acc.totalOffline += row.offline;
      acc.totalFault += row.fault;
      return acc;
    },
    { totalOnline: 0, totalOffline: 0, totalFault: 0 }
  );

  return NextResponse.json({
    ...summary,
    models: rows.map((row) => ({
      model: row.model ?? 'ไม่ทราบรุ่น',
      online: row.online,
      offline: row.offline,
      fault: row.fault,
      onlinePercentage:
        row.online + row.offline + row.fault > 0
          ? Math.round((row.online / (row.online + row.offline + row.fault)) * 100)
          : 0
    }))
  });
}
