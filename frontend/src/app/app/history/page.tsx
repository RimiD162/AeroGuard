'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import { getJobs, DBJob } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, Filter, Loader2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Complete', color: '#16A34A' },
  processing: { label: 'Processing', color: '#2563EB' },
  failed: { label: 'Failed', color: '#DC2626' },
  pending: { label: 'Pending', color: '#71717A' },
  queued: { label: 'Queued', color: '#71717A' },
  uploaded: { label: 'Uploaded', color: '#71717A' },
  purged: { label: 'Purged', color: '#71717A' },
};

export default function HistoryPage() {
  const [jobs, setJobs] = useState<DBJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(0);
  const perPage = 8;

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await getJobs(1, 200);
        setJobs(data);
      } catch (err) {
        console.error('Failed to load jobs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const filtered = jobs.filter((job) => {
    if (search) {
      const term = search.toLowerCase();
      const matchesFilename = job.originalFilename?.toLowerCase().includes(term);
      const matchesId = job.id.toLowerCase().includes(term);
      if (!matchesFilename && !matchesId) return false;
    }
    if (statusFilter.length && !statusFilter.includes(job.status)) return false;
    return true;
  });

  const pageData = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  };

  return (
    <div className="min-h-screen bg-base">
      <TopBar title="Inspection History" />
      <div className="page-enter flex">
        {/* Filter sidebar */}
        {showFilters && (
          <aside className="hidden w-[260px] shrink-0 border-r border-border-subtle bg-surface p-5 lg:block">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[13px] font-medium text-text-primary">Filters</span>
              <button onClick={() => { setStatusFilter([]); setSearch(''); setPage(0); }} className="text-[11px] text-accent hover:text-accent-hover">Clear all</button>
            </div>
            <div className="mb-5">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-tertiary">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Filename or job ID" className="w-full rounded-md border border-border-subtle bg-elevated pl-8 pr-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent" />
              </div>
            </div>
            <div className="mb-5">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.04em] text-text-tertiary">Status</span>
              {['completed', 'processing', 'failed', 'pending', 'queued'].map((s) => (
                <label key={s} className="flex items-center gap-2 py-1 text-[13px] text-text-secondary cursor-pointer hover:text-text-primary">
                  <input type="checkbox" checked={statusFilter.includes(s)} onChange={() => { toggle(statusFilter, s, setStatusFilter); setPage(0); }} className="h-3.5 w-3.5 rounded border-border-default bg-elevated accent-accent" />
                  <span>{statusConfig[s]?.label}</span>
                </label>
              ))}
            </div>
          </aside>
        )}

        {/* Main table */}
        <div className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[13px] text-text-tertiary">
              {loading ? 'Loading...' : `${filtered.length} inspections`}
            </span>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary transition-colors lg:hidden">
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-24">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <span className="ml-3 text-[13px] text-text-secondary">Loading inspections...</span>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border-subtle bg-surface overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      {['Job ID', 'File', 'Created', 'Defects', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-text-tertiary whitespace-nowrap" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((job) => {
                      const st = statusConfig[job.status] || statusConfig.pending;
                      const created = new Date(job.createdAt);
                      return (
                        <tr key={job.id} className="border-b border-border-subtle last:border-0 hover:bg-elevated/50 transition-colors cursor-pointer">
                          <td className="px-4 py-3">
                            <Link href={`/app/inspection/${job.id}`} className="font-mono text-[13px] text-text-primary hover:text-accent">
                              {job.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-text-secondary whitespace-nowrap max-w-[200px] truncate">
                            {job.originalFilename || '—'}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-text-tertiary">
                            {created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-text-primary">{job.metricsCount}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: st.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                              {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {pageData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-[13px] text-text-tertiary">
                          No inspections found. Upload a video to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[12px] text-text-tertiary">Page {page + 1} of {totalPages || 1}</span>
                <div className="flex gap-1">
                  <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="rounded p-1 text-text-tertiary hover:bg-elevated disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="rounded p-1 text-text-tertiary hover:bg-elevated disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
