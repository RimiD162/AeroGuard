'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import DefectBadge from '@/components/shared/DefectBadge';
import SeverityIndicator from '@/components/shared/SeverityIndicator';
import { Box, FileText, Flag, Loader2, AlertCircle } from 'lucide-react';
import { getJob, getJobMetrics, DBJob, DBMetric } from '@/lib/api';
import { DefectSeverity } from '@/types/defect';

function deriveSeverity(confidence: number | null): DefectSeverity {
  if (confidence === null) return 'minor';
  if (confidence >= 95) return 'critical';
  if (confidence >= 90) return 'major';
  if (confidence >= 80) return 'moderate';
  return 'minor';
}

function severityColor(sev: DefectSeverity): string {
  const map: Record<DefectSeverity, string> = {
    critical: '#DC2626',
    major: '#D97706',
    moderate: '#EA580C',
    minor: '#16A34A',
  };
  return map[sev];
}

export default function InspectionDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<DBJob | null>(null);
  const [metrics, setMetrics] = useState<DBMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    async function fetchJob() {
      try {
        setLoading(true);
        const [jobData, metricsData] = await Promise.all([
          getJob(jobId),
          getJobMetrics(jobId),
        ]);
        setJob(jobData);
        setMetrics(metricsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load inspection');
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <TopBar title="Inspection Detail" subtitle={jobId} />
        <div className="flex items-center justify-center p-24">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="ml-3 text-[13px] text-text-secondary">Loading inspection...</span>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-base">
        <TopBar title="Inspection Detail" subtitle={jobId} />
        <div className="flex flex-col items-center justify-center p-24">
          <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
          <span className="text-[13px] text-text-secondary">{error || 'Inspection not found'}</span>
          <Link href="/app/history" className="mt-4 text-[13px] text-accent hover:text-accent-hover">
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const severityCounts = metrics.reduce(
    (acc, m) => {
      const sev = deriveSeverity(m.confidence);
      acc[sev]++;
      return acc;
    },
    { critical: 0, major: 0, moderate: 0, minor: 0 }
  );

  const statusConfig: Record<string, { label: string; color: string }> = {
    completed: { label: 'Complete', color: '#16A34A' },
    processing: { label: 'Processing', color: '#2563EB' },
    failed: { label: 'Failed', color: '#DC2626' },
    pending: { label: 'Pending', color: '#71717A' },
    queued: { label: 'Queued', color: '#71717A' },
    uploaded: { label: 'Uploaded', color: '#71717A' },
    purged: { label: 'Purged', color: '#71717A' },
  };

  const st = statusConfig[job.status] || statusConfig.pending;
  const maxSeverity = severityCounts.critical > 0
    ? 'critical'
    : severityCounts.major > 0
    ? 'major'
    : severityCounts.moderate > 0
    ? 'moderate'
    : metrics.length > 0
    ? 'minor'
    : null;

  const createdDate = new Date(job.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const createdTime = new Date(job.createdAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-base">
      <TopBar title="Inspection Detail" subtitle={job.originalFilename || job.id.slice(0, 8)} />
      <div className="page-enter p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-border-subtle bg-surface p-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-[22px] font-medium text-text-primary">
                {job.originalFilename || 'Untitled'}
              </span>
              {maxSeverity && <DefectBadge severity={maxSeverity} size="md" />}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-text-secondary">
              <span className="font-mono">{job.id.slice(0, 8)}</span>
              <span>{job.fileSizeBytes ? `${(job.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : '—'}</span>
              <span>{createdDate} {createdTime}</span>
              <span>
                <span className="inline-flex items-center gap-1.5" style={{ color: st.color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.color }} />
                  {st.label}
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/app/models/demo"
              className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-medium text-white hover:bg-accent-hover transition-colors"
            >
              <Box className="h-3.5 w-3.5" /> View 3D Twin
            </Link>
            <button className="flex items-center gap-1.5 rounded-md border border-border-default px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">
              <FileText className="h-3.5 w-3.5" /> Download Report
            </button>
            <button className="flex items-center gap-1.5 rounded-md border border-border-default px-4 py-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors">
              <Flag className="h-3.5 w-3.5" /> Flag for Review
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: 'Total Detections', value: metrics.length, color: '#FAFAFA' },
            { label: 'Critical', value: severityCounts.critical, color: '#DC2626' },
            { label: 'Major', value: severityCounts.major, color: '#D97706' },
            { label: 'Moderate', value: severityCounts.moderate, color: '#EA580C' },
            { label: 'Minor', value: severityCounts.minor, color: '#16A34A' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border-subtle bg-surface p-4">
              <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-text-tertiary">{s.label}</span>
              <div className="mt-1 text-[28px] font-medium leading-none" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Defects */}
        <div>
          <h3 className="mb-4 text-[15px] font-medium text-text-primary">Detected Defects</h3>
          {metrics.length === 0 ? (
            <div className="rounded-lg border border-border-subtle bg-surface p-8 text-center">
              <span className="text-[13px] text-text-tertiary">
                {job.status === 'completed'
                  ? 'No defects detected in this inspection.'
                  : 'Metrics will appear once processing is complete.'}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.map((m) => {
                const sev = deriveSeverity(m.confidence);
                const bboxDefined = m.bboxX1 !== null && m.bboxY1 !== null && m.bboxX2 !== null && m.bboxY2 !== null;
                return (
                  <div key={m.id} className="rounded-lg border border-border-subtle bg-surface p-5 transition-colors hover:border-border-default">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[14px] font-medium text-text-primary">{m.id.slice(0, 8)}</span>
                        <DefectBadge severity={sev} />
                      </div>
                      <SeverityIndicator level={sev === 'critical' ? 5 : sev === 'major' ? 4 : sev === 'moderate' ? 3 : 2} />
                    </div>
                    <div className="grid gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-text-tertiary">Label:</span>{' '}
                        <span className="text-text-primary">{m.label}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Type:</span>{' '}
                        <span className="text-text-primary">{m.metricType}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Confidence:</span>{' '}
                        <span className="text-accent font-mono">{m.confidence !== null ? `${m.confidence.toFixed(1)}%` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Frame:</span>{' '}
                        <span className="font-mono text-text-primary">{m.frameTimestampMs}ms</span>
                      </div>
                      {bboxDefined && (
                        <>
                          <div>
                            <span className="text-text-tertiary">Bounding Box:</span>{' '}
                            <span className="font-mono text-text-primary">
                              ({m.bboxX1!.toFixed(1)}, {m.bboxY1!.toFixed(1)}) → ({m.bboxX2!.toFixed(1)}, {m.bboxY2!.toFixed(1)})
                            </span>
                          </div>
                          <div>
                            <span className="text-text-tertiary">Area:</span>{' '}
                            <span className="font-mono text-text-primary">
                              {((m.bboxX2! - m.bboxX1!) * (m.bboxY2! - m.bboxY1!)).toFixed(0)} sq
                            </span>
                          </div>
                        </>
                      )}
                      {m.rawValue && (
                        <div className="sm:col-span-2 lg:col-span-3">
                          <span className="text-text-tertiary">Raw Value:</span>{' '}
                          <span className="text-text-primary">{m.rawValue}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-text-tertiary">Detected:</span>{' '}
                        <span className="text-text-primary">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
