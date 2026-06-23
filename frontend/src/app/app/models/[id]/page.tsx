'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DefectBadge from '@/components/shared/DefectBadge';
import DefectPanel from '@/components/twin/DefectPanel';
import ViewerToolbar from '@/components/twin/ViewerToolbar';
import HeatmapLegend from '@/components/twin/HeatmapLegend';
import { getJob, getJobMetrics, DBMetric } from '@/lib/api';
import { useTwinStore } from '@/stores/twin.store';
import { Defect, DefectSeverity, DefectType } from '@/types/defect';
import { ArrowLeft, Loader2 } from 'lucide-react';

const EngineViewer = dynamic(() => import('@/components/twin/EngineViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-base">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
    </div>
  ),
});

function deriveSeverity(confidence: number | null): DefectSeverity {
  if (confidence === null) return 'minor';
  if (confidence >= 95) return 'critical';
  if (confidence >= 90) return 'major';
  if (confidence >= 80) return 'moderate';
  return 'minor';
}

/**
 * Maps a YOLO model class name (as stored in the DB label field)
 * to a canonical DefectType. Normalizes common variations.
 */
const LABEL_TO_TYPE: Record<string, DefectType> = {
  crack: 'surface_crack',
  surface_crack: 'surface_crack',
  fatigue_crack: 'fatigue_crack',
  corrosion: 'corrosion',
  erosion: 'erosion',
  dent: 'dent',
  foreign_object_damage: 'foreign_object_damage',
  fod: 'foreign_object_damage',
  thermal_damage: 'thermal_damage',
  coating_loss: 'coating_loss',
  welding: 'surface_crack',
};

function resolveDefectType(label: string): DefectType {
  const normalised = label.toLowerCase().replace(/[\s-]+/g, '_').trim();
  if (LABEL_TO_TYPE[normalised]) return LABEL_TO_TYPE[normalised];
  for (const [key, val] of Object.entries(LABEL_TO_TYPE)) {
    if (normalised.includes(key)) return val;
  }
  return 'surface_crack';
}

function metricToDefect(m: DBMetric, index: number): Defect {
  const sev = deriveSeverity(m.confidence);
  const x1 = m.bboxX1 || 0;
  const y1 = m.bboxY1 || 0;
  const x2 = m.bboxX2 || 0;
  const y2 = m.bboxY2 || 0;
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const detectedLabel = m.label || `Detection ${index + 1}`;

  const priority: Defect['priority'] =
    sev === 'critical' ? 'immediate' :
    sev === 'major' ? 'next_shop_visit' : 'monitor';

  return {
    id: m.id.slice(0, 8),
    inspectionId: m.jobId,
    bladeId: detectedLabel,
    section: m.metricType || 'defect',
    type: resolveDefectType(detectedLabel),
    severity: sev,
    dimensions: { length: Math.round(width * 100) || 10, width: Math.round(height * 100) || 5 },
    confidence: m.confidence || 0,
    location: `Frame ${m.frameTimestampMs}ms`,
    faaReference: 'AC 33.27',
    recommendation:
      sev === 'critical' ? 'Remove from service immediately' :
      sev === 'major' ? 'Schedule replacement' :
      'Monitor and reinspect',
    partNumber: 'N/A',
    repairCost: sev === 'critical' ? 45000 : sev === 'major' ? 25000 : sev === 'moderate' ? 12000 : 5000,
    priority,
    position3d: {
      x: (x1 + x2) / 2 * 4 - 2,
      y: (y1 + y2) / 2 * 2 - 1,
      z: Math.sin(m.frameTimestampMs / 1000) * 2,
    },
  };
}

export default function DigitalTwinPage() {
  const params = useParams();
  const jobId = params.id as string;
  const { selectedDefectId, panelOpen, setSelectedDefect } = useTwinStore();

  const [defects, setDefects] = useState<Defect[]>([]);
  const [jobFilename, setJobFilename] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    async function fetchData() {
      try {
        const [jobData, metricsData] = await Promise.all([
          getJob(jobId),
          getJobMetrics(jobId),
        ]);
        setJobFilename(jobData.originalFilename || 'Unknown');
        const mapped = metricsData.map((m, i) => metricToDefect(m, i));
        setDefects(mapped);
      } catch (err) {
        console.error('Failed to load twin data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [jobId]);

  const selectedDefect = defects.find((d) => d.id === selectedDefectId) || null;

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Left panel — defect list */}
      <aside className="hidden w-[300px] shrink-0 flex-col border-r border-border-subtle bg-surface lg:flex">
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Link href="/app/dashboard" className="text-text-tertiary hover:text-text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-[14px] font-medium text-text-primary">3D Digital Twin</div>
            <div className="text-[11px] text-text-tertiary font-mono">{jobFilename} · {jobId.slice(0, 8)}</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="ml-2 text-[12px] text-text-tertiary">Loading...</span>
            </div>
          ) : (
            <>
              <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-tertiary">
                {defects.length} Defects Found
              </div>
              {defects.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDefect(d.id)}
                  className={`w-full rounded-md p-3 text-left transition-all ${
                    selectedDefectId === d.id
                      ? 'border border-accent/40 bg-accent-subtle'
                      : 'border border-transparent hover:bg-elevated'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[12px] text-text-primary">{d.id}</span>
                    <DefectBadge severity={d.severity} />
                  </div>
                  <div className="text-[12px] text-text-secondary">{d.bladeId} — {d.section}</div>
                  <div className="text-[11px] text-text-tertiary capitalize">{d.type.replace(/_/g, ' ')}</div>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {/* Center — 3D canvas */}
      <div className="relative flex-1">
        <EngineViewer defects={defects} />
        <ViewerToolbar />
        <HeatmapLegend />
      </div>

      {/* Right panel — defect detail */}
      {panelOpen && selectedDefect && (
        <DefectPanel defect={selectedDefect} />
      )}
    </div>
  );
}
