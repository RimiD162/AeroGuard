'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { getJobs, DBJob } from '@/lib/api';

const statusLabels: Record<string, { label: string; color: string }> = {
  completed: { label: 'Complete', color: '#16A34A' },
  processing: { label: 'In Progress', color: '#2563EB' },
  failed: { label: 'Failed', color: '#DC2626' },
  pending: { label: 'Pending', color: '#71717A' },
  queued: { label: 'Queued', color: '#71717A' },
  uploaded: { label: 'Uploaded', color: '#71717A' },
  purged: { label: 'Purged', color: '#71717A' },
};

export default function RecentInspections() {
  const [jobs, setJobs] = useState<DBJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 5;

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await getJobs(1, 20);
        setJobs(data);
      } catch (err) {
        console.error('Failed to load recent inspections:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const pageData = jobs.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(jobs.length / perPage);

  return (
    <div className="rounded-lg border border-border-subtle bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <h3 className="text-[15px] font-medium text-text-primary">Recent Inspections</h3>
        <Link href="/app/history" className="text-[12px] text-accent hover:text-accent-hover transition-colors">
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border-subtle">
              {['Job ID', 'File', 'Created', 'Defects', 'Status'].map((h) => (
                <th
                  key={h}
                  className="px-5 py-2.5 text-text-tertiary"
                  style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center">
                  <Loader2 className="h-4 w-4 animate-spin text-accent inline-block" />
                  <span className="ml-2 text-[13px] text-text-tertiary">Loading...</span>
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-[13px] text-text-tertiary">
                  No inspections yet.
                </td>
              </tr>
            ) : (
              pageData.map((job) => {
                const st = statusLabels[job.status] || statusLabels.pending;
                const created = new Date(job.createdAt);
                return (
                  <tr key={job.id} className="border-b border-border-subtle last:border-0 transition-colors hover:bg-elevated/50">
                    <td className="px-5 py-3 font-mono text-[13px] text-text-primary">
                      <Link href={`/app/inspection/${job.id}`} className="hover:text-accent">
                        {job.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary max-w-[180px] truncate">
                      {job.originalFilename || '—'}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-text-tertiary">
                      {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-text-primary">{job.metricsCount}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: st.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
        <span className="text-[12px] text-text-tertiary">
          Page {page + 1} of {totalPages || 1}
        </span>
        <div className="flex gap-1">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded p-1 text-text-tertiary hover:bg-elevated disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded p-1 text-text-tertiary hover:bg-elevated disabled:opacity-30 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
