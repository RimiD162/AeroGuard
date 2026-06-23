'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getJobs, DBJob } from '@/lib/api';
import StatusDot from '@/components/shared/StatusDot';
import { Loader2 } from 'lucide-react';

const predictiveData = Array.from({ length: 20 }, (_, i) => ({
  month: `M${i + 1}`,
  probability: Math.min(5 + i * 2.5 + Math.random() * 8, 95),
  upper: Math.min(15 + i * 3 + Math.random() * 10, 100),
  lower: Math.max(i * 1.5 + Math.random() * 5, 0),
}));

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border-subtle bg-elevated px-3 py-2 shadow-md">
      <p className="text-[11px] text-text-tertiary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-[12px]" style={{ color: p.color }}>{p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
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

function computeFleetData(jobs: DBJob[]) {
  const byFile: Record<string, { total: number; completed: number; lastDate: string }> = {};

  for (const job of jobs) {
    const name = job.originalFilename || 'Unknown';
    const created = new Date(job.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    if (!byFile[name]) byFile[name] = { total: 0, completed: 0, lastDate: created };
    byFile[name].total++;
    if (job.status === 'completed') byFile[name].completed++;
    if (created > byFile[name].lastDate) byFile[name].lastDate = created;
  }

  return Object.entries(byFile)
    .map(([name, data]) => ({
      aircraft: name,
      healthScore: data.total > 0 ? Math.round((data.completed / data.total) * 1000) / 10 : 0,
      inspections: data.total,
      lastInspected: data.lastDate,
    }))
    .sort((a, b) => b.inspections - a.inspections)
    .slice(0, 6);
}

export default function AnalysisPage() {
  const [jobs, setJobs] = useState<DBJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await getJobs(1, 200);
        setJobs(data);
      } catch (err) {
        console.error('Failed to load analysis data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const trendData = computeTrendData(jobs, days);
  const fleetData = computeFleetData(jobs);

  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <TopBar title="Analysis" subtitle="Defect trends, predictions, and fleet health monitoring" />
        <div className="flex items-center justify-center p-24">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="ml-3 text-[13px] text-text-secondary">Loading analysis...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <TopBar title="Analysis" subtitle="Defect trends, predictions, and fleet health monitoring" />
      <div className="page-enter p-6 space-y-6">
        {/* Defect Trends — full width */}
        <div className="rounded-lg border border-border-subtle bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-medium text-text-primary">Defect Trends</h3>
            <div className="flex gap-1 rounded-md border border-border-subtle p-0.5">
              {(['7d', '30d', '90d'] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${range === r ? 'bg-accent-subtle text-accent' : 'text-text-tertiary hover:text-text-secondary'}`}>{r}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="aInspections" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.15} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                <linearGradient id="aDefects" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DC2626" stopOpacity={0.15} /><stop offset="100%" stopColor="#DC2626" stopOpacity={0} /></linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="inspections" stroke="#2563EB" fill="url(#aInspections)" strokeWidth={1.5} />
              <Area type="monotone" dataKey="defects" stroke="#DC2626" fill="url(#aDefects)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Predictive Maintenance */}
          <div className="rounded-lg border border-border-subtle bg-surface p-5">
            <h3 className="mb-4 text-[15px] font-medium text-text-primary">Predictive Failure Probability</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={predictiveData}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.1} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} width={30} domain={[0, 100]} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#band)" />
                <Area type="monotone" dataKey="lower" stroke="transparent" fill="#090909" />
                <Line type="monotone" dataKey="probability" stroke="#2563EB" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Fleet Health Grid */}
          <div className="rounded-lg border border-border-subtle bg-surface p-5">
            <h3 className="mb-4 text-[15px] font-medium text-text-primary">Fleet Health Grid</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {fleetData.length === 0 ? (
                <div className="col-span-2 flex items-center justify-center h-[280px] text-[13px] text-text-tertiary">
                  No data available
                </div>
              ) : (
                fleetData.map((a) => (
                  <div key={a.aircraft} className="rounded-md border border-border-subtle bg-elevated p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-text-primary">{a.aircraft}</span>
                      <StatusDot status={a.healthScore >= 95 ? 'complete' : a.healthScore >= 90 ? 'in_progress' : 'failed'} />
                    </div>
                    <div className="text-[22px] font-medium text-text-primary mb-1">{a.healthScore}%</div>
                    <div className="flex justify-between text-[11px] text-text-tertiary">
                      <span>{a.inspections} inspections</span>
                      <span>Last: {a.lastInspected}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-border-subtle overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.healthScore}%`, backgroundColor: a.healthScore >= 95 ? '#16A34A' : a.healthScore >= 90 ? '#2563EB' : '#D97706' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
