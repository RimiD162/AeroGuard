'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DBJob } from '@/lib/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-elevated px-3 py-2 shadow-md">
      <p className="mb-1 text-[11px] font-medium text-text-tertiary">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[12px]" style={{ color: p.color }}>
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  );
};

function computeTrendData(jobs: DBJob[], days: number) {
  const now = new Date();
  const data: { date: string; inspections: number; defects: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const dayJobs = jobs.filter((j) => {
      const created = new Date(j.createdAt);
      return created >= dayStart && created < dayEnd;
    });

    data.push({
      date: dateStr,
      inspections: dayJobs.length,
      defects: dayJobs.reduce((sum, j) => sum + j.metricsCount, 0),
    });
  }

  return data;
}

export default function DefectTrend({ jobs }: { jobs: DBJob[] }) {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const data = computeTrendData(jobs, days);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-medium text-text-primary">Defect Trends</h3>
        <div className="flex gap-1 rounded-md border border-border-subtle p-0.5">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                range === r ? 'bg-accent-subtle text-accent' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="gInspections" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gDefects" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#DC2626" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="inspections" stroke="#2563EB" fill="url(#gInspections)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="defects" stroke="#DC2626" fill="url(#gDefects)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
