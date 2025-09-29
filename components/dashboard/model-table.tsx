'use client';

interface ModelTableProps {
  models: Array<{
    model: string;
    online: number;
    offline: number;
    fault: number;
    onlinePercentage: number;
  }>;
}

export function ModelTable({ models }: ModelTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              Charger Point Model
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Online
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
              Offline
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-amber-600">
              Fault
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
              % Online
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {models.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted-foreground">
                ไม่มีข้อมูลการเชื่อมต่อในช่วงเวลานี้
              </td>
            </tr>
          ) : (
            models.map((item) => (
              <tr key={item.model} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{item.model}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{item.online}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{item.offline}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-amber-600">{item.fault}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{item.onlinePercentage}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
