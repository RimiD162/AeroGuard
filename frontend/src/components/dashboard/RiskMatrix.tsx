'use client';

import { DBJob } from '@/lib/api';

const statusColors: Record<string, string> = {
  completed: '#16A34A',
  processing: '#2563EB',
  failed: '#DC2626',
  pending: '#71717A',
  queued: '#71717A',
};

function computeMatrixData(jobs: DBJob[]) {
  const byFile: Record<string, Record<string, number>> = {};

  for (const job of jobs) {
    const name = job.originalFilename || 'Unknown';
    if (!byFile[name]) byFile[name] = {};
    byFile[name][job.status] = (byFile[name][job.status] || 0) + 1;
  }

  return Object.entries(byFile)
    .map(([file, statuses]) => ({
      component: file.length > 25 ? file.slice(0, 23) + '...' : file,
      ...statuses,
    }))
    .slice(0, 8);
}

export default function RiskMatrix({ jobs }: { jobs: DBJob[] }) {
  const data = computeMatrixData(jobs);
  const statuses = ['completed', 'processing', 'failed', 'pending', 'queued'];
  const maxVal = Math.max(...data.flatMap((row) => statuses.map((s) => (row as any)[s] || 0)), 1);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-5">
      <h3 className="mb-4 text-[15px] font-medium text-text-primary">Job Status Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-3 py-2 text-text-tertiary" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>File</th>
              {statuses.map((s) => (
                <th key={s} className="px-3 py-2 text-center text-text-tertiary" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={statuses.length + 1} className="px-3 py-8 text-center text-[13px] text-text-tertiary">
                  No data available
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.component} className="border-t border-border-subtle">
                  <td className="px-3 py-2 text-[13px] text-text-secondary">{row.component}</td>
                  {statuses.map((sev) => {
                    const val = (row as any)[sev] || 0;
                    return (
                      <td key={sev} className="px-3 py-2 text-center">
                        <div
                          className="mx-auto flex h-8 w-12 items-center justify-center rounded text-[12px] font-medium"
                          style={{
                            backgroundColor: `${statusColors[sev]}${Math.round((val / maxVal) * 200).toString(16).padStart(2, '0')}`,
                            color: val > 0 ? '#FAFAFA' : statusColors[sev],
                          }}
                        >
                          {val}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        {Object.entries(statusColors).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
