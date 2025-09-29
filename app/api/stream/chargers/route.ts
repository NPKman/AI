import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ChargerStatusRow {
  charger_point_name: string;
  ip_address: string;
  online: number | null;
  heartbeat_timestamp: string | null;
  charger_point_model: string | null;
  firmware_version: string | null;
  server_url: string | null;
  server_url2: string | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stationId = Number(url.searchParams.get('stationId'));

  if (!stationId) {
    return NextResponse.json({ message: 'ต้องระบุ stationId' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      async function pushUpdate() {
        try {
          const sql = `
          SELECT
            cl.charger_point_name,
            cl.ip_address,
            cl.online,
            cl.heartbeat_timestamp,
            cl.charger_point_model,
            cl.firmware_version,
            cl.server_url,
            cl.server_url2
          FROM charger_list AS cl
          INNER JOIN charger AS c ON cl.charger_id = c.charger_id
          WHERE c.station_id = ?
          ORDER BY cl.charger_point_name
        `;
          const rows = await query<ChargerStatusRow>(sql, [stationId]);
          const payload = rows.map((row) => ({
            chargerPointName: row.charger_point_name,
            ipAddress: row.ip_address,
            status: row.online === 1 ? 'ONLINE' : row.online === 0 ? 'OFFLINE' : 'UNKNOWN',
            lastTime: row.heartbeat_timestamp,
            model: row.charger_point_model,
            firmware: row.firmware_version,
            serverUrl1: row.server_url,
            serverUrl2: row.server_url2
          }));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chargers: payload })}\n\n`));
        } catch (error) {
          console.error('SSE query error', error);
        }
      }

      await pushUpdate();
      const interval = setInterval(() => {
        pushUpdate().catch((error) => {
          console.error('SSE update error', error);
        });
      }, 30000);

      const abortHandler = () => clearInterval(interval);
      request.signal.addEventListener('abort', abortHandler);
    },
    cancel() {
      // handled by abort handler
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
