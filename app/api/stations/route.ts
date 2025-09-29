import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { stationSearchSchema } from '@/lib/validators';

interface StationRow {
  station_id: number;
  ec_id: string | null;
  station_name: string;
  province_name_th: string | null;
  province_name_en: string | null;
  station_type: string | null;
  charger_count: number;
  online_count: number;
  offline_count: number;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = stationSearchSchema.parse(params);
  const { q, province, status, stationType, page, pageSize } = parsed;

  const where: string[] = [];
  const whereParams: (string | number)[] = [];

  if (q) {
    where.push('(s.station_name_th LIKE ? OR s.station_name_en LIKE ? OR s.station_name LIKE ?)');
    const keyword = `%${q}%`;
    whereParams.push(keyword, keyword, keyword);
  }

  if (province) {
    where.push('(p.province_name_th = ? OR p.province_name_en = ?)');
    whereParams.push(province, province);
  }

  if (stationType) {
    where.push('(st.name_th = ? OR st.name_en = ?)');
    whereParams.push(stationType, stationType);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const havingClause = status ? 'HAVING SUM(CASE WHEN cl.online = ? THEN 1 ELSE 0 END) > 0' : '';
  const havingParams = status ? [status === 'ONLINE' ? 1 : 0] : [];

  const listQuery = `
    SELECT
      s.station_id,
      s.ax_cost_center AS ec_id,
      COALESCE(s.station_name_th, s.station_name_en, s.station_name) AS station_name,
      p.province_name_th,
      p.province_name_en,
      COALESCE(st.name_th, st.name_en) AS station_type,
      COUNT(DISTINCT cl.charger_point_name) AS charger_count,
      SUM(CASE WHEN cl.online = 1 THEN 1 ELSE 0 END) AS online_count,
      SUM(CASE WHEN cl.online = 0 THEN 1 ELSE 0 END) AS offline_count
    FROM charger_list AS cl
    INNER JOIN charger AS c ON cl.charger_id = c.charger_id
    INNER JOIN station AS s ON c.station_id = s.station_id
    INNER JOIN province AS p ON p.province_id = s.province_id
    INNER JOIN station_type AS st ON s.station_type = st.station_type_id
    ${whereClause}
    GROUP BY s.station_id, ec_id, station_name, p.province_name_th, p.province_name_en, station_type
    ${havingClause}
    ORDER BY station_name
    LIMIT ? OFFSET ?
  `;

  const rows = await query<StationRow>(listQuery, [...whereParams, ...havingParams, pageSize, (page - 1) * pageSize]);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT s.station_id
      FROM charger_list AS cl
      INNER JOIN charger AS c ON cl.charger_id = c.charger_id
      INNER JOIN station AS s ON c.station_id = s.station_id
      INNER JOIN province AS p ON p.province_id = s.province_id
      INNER JOIN station_type AS st ON s.station_type = st.station_type_id
      ${whereClause}
      GROUP BY s.station_id
      ${havingClause}
    ) AS sub
  `;

  const totalRows = await query<{ total: number }>(countQuery, [...whereParams, ...havingParams]);
  const total = totalRows[0]?.total ?? 0;

  return NextResponse.json({
    page,
    pageSize,
    total,
    data: rows.map((row) => ({
      stationId: row.station_id,
      ecId: row.ec_id,
      name: row.station_name,
      provinceTh: row.province_name_th,
      provinceEn: row.province_name_en,
      stationType: row.station_type,
      chargerCount: row.charger_count,
      onlineCount: row.online_count,
      offlineCount: row.offline_count
    }))
  });
}
