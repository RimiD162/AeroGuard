'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, AlertOctagon, Shield, Wrench, DollarSign, Loader2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import KPICard from '@/components/dashboard/KPICard';
import DefectTrend from '@/components/dashboard/DefectTrend';
import FleetOverview from '@/components/dashboard/FleetOverview';
import RecentInspections from '@/components/dashboard/RecentInspections';
import RiskMatrix from '@/components/dashboard/RiskMatrix';
import { getJobs, DBJob } from '@/lib/api';

export default function DashboardPage() {
  const [jobs, setJobs] = useState<DBJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const data = await getJobs(1, 200);
        setJobs(data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'completed').length;
  const totalDefects = jobs.reduce((sum, j) => sum + j.metricsCount, 0);
  const criticalDefects = jobs.filter((j) => j.metricsCount > 0).length;

  const kpiData = {
    aircraftInspected: totalJobs,
    defectsDetected: totalDefects,
    criticalFindings: criticalDefects,
    fleetHealthScore: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100 * 10) / 10 : 100,
    openWorkOrders: jobs.filter((j) => j.status === 'processing' || j.status === 'queued').length,
    maintenanceCost: totalDefects * 15000,
    deltas: {
      aircraftInspected: 0,
      defectsDetected: 0,
      criticalFindings: 0,
      fleetHealthScore: 0,
      openWorkOrders: 0,
      maintenanceCost: 0,
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base">
        <TopBar title="Dashboard" />
        <div className="flex items-center justify-center p-24">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="ml-3 text-[13px] text-text-secondary">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      <TopBar title="Dashboard" />

      <div className="page-enter p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <KPICard label="Total Inspections" value={kpiData.aircraftInspected} format="number" delta={kpiData.deltas.aircraftInspected} icon={Activity} />
          <KPICard label="Defects Detected" value={kpiData.defectsDetected} format="number" delta={kpiData.deltas.defectsDetected} icon={AlertTriangle} />
          <KPICard label="Inspections With Defects" value={kpiData.criticalFindings} format="number" delta={kpiData.deltas.criticalFindings} icon={AlertOctagon} />
          <KPICard label="Completion Rate" value={kpiData.fleetHealthScore} format="percentage" delta={kpiData.deltas.fleetHealthScore} icon={Shield} />
          <KPICard label="Processing / Queued" value={kpiData.openWorkOrders} format="number" delta={kpiData.deltas.openWorkOrders} icon={Wrench} />
          <KPICard label="Est. Maintenance Cost" value={kpiData.maintenanceCost} format="currency" delta={kpiData.deltas.maintenanceCost} icon={DollarSign} />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DefectTrend jobs={jobs} />
          </div>
          <div>
            <FleetOverview jobs={jobs} />
          </div>
        </div>

        {/* Recent Inspections */}
        <RecentInspections />

        {/* Risk Matrix */}
        <RiskMatrix jobs={jobs} />
      </div>
    </div>
  );
}
