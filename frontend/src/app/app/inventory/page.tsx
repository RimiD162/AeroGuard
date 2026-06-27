'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { Search, CheckCircle2, AlertTriangle, XCircle, Star, ExternalLink } from 'lucide-react';

const parts = [
  { pn: 'CFM56-5B-B21370', desc: 'Fan Blade Assembly', mfr: 'Safran', qty: 4, min: 2, status: 'in_stock' as const },
  { pn: 'CFM56-5B-H14290', desc: 'HPT Blade, Stage 1', mfr: 'Safran', qty: 1, min: 2, status: 'low_stock' as const },
  { pn: 'CFM56-5B-L28410', desc: 'LPT Blade, Stage 2', mfr: 'Safran', qty: 0, min: 1, status: 'out_of_stock' as const },
  { pn: 'PW1100G-F10920', desc: 'Fan Blade, Stage 1', mfr: 'Pratt & Whitney', qty: 8, min: 3, status: 'in_stock' as const },
  { pn: 'A320-41-P003A', desc: 'Belly Panel Assembly', mfr: 'Airbus', qty: 2, min: 1, status: 'in_stock' as const },
  { pn: 'PW1900G-N06730', desc: 'NGV, HPT Stage 1', mfr: 'Pratt & Whitney', qty: 3, min: 2, status: 'in_stock' as const },
  { pn: 'CFM56-CB-01224', desc: 'Combustion Liner', mfr: 'GE Aviation', qty: 1, min: 2, status: 'low_stock' as const },
  { pn: 'RR-T700-S0891', desc: 'Seal, HPT Interstage', mfr: 'Rolls-Royce', qty: 12, min: 4, status: 'in_stock' as const },
  { pn: 'GE90-BRG-4420', desc: 'Bearing, #4 Main Shaft', mfr: 'GE Aviation', qty: 6, min: 3, status: 'in_stock' as const },
  { pn: 'V2500-CS-0817', desc: 'Casing, Fan Frame', mfr: 'IAE', qty: 0, min: 1, status: 'out_of_stock' as const },
];

const dummyOrders = [
  { id: 'PO-2024-0312', pn: 'CFM56-5B-L28410', desc: 'LPT Blade, Stage 2', qty: 2, supplier: 'Aviall Services', status: 'pending', date: '2025-06-12', eta: '2025-06-17', cost: 104000, priority: 'critical' as const, inspection: 'INS-2024-0840' },
  { id: 'PO-2024-0311', pn: 'CFM56-CB-01224', desc: 'Combustion Liner', qty: 3, supplier: 'HEICO Corp', status: 'shipped', date: '2025-06-10', eta: '2025-06-14', cost: 87600, priority: 'urgent' as const, inspection: 'INS-2024-0841' },
  { id: 'PO-2024-0310', pn: 'V2500-CS-0817', desc: 'Casing, Fan Frame', qty: 1, supplier: 'AAR Corp', status: 'approved', date: '2025-06-08', eta: '2025-06-20', cost: 156000, priority: 'routine' as const, inspection: 'INS-2024-0845' },
];

const suppliers = [
  { name: 'Aviall Services Inc.', location: 'Dallas, TX, USA', leadTime: '3–5 days', rating: 4.8, email: 'enterprise@aviall.com' },
  { name: 'HEICO Corporation', location: 'Hollywood, FL, USA', leadTime: '5–7 days', rating: 4.6, email: 'parts@heico.com' },
  { name: 'AAR Corp', location: 'Chicago, IL, USA', leadTime: '4–6 days', rating: 4.5, email: 'sales@aarcorp.com' },
  { name: 'Pratt & Whitney', location: 'East Hartford, CT, USA', leadTime: '7–14 days', rating: 4.9, email: 'spares@pw.utc.com' },
  { name: 'Safran Aircraft Engines', location: 'Villaroche, France', leadTime: '10–18 days', rating: 4.7, email: 'parts@safrangroup.com' },
];

const statusBadge = (s: string) => {
  if (s === 'in_stock') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success"><CheckCircle2 className="h-3 w-3" />In Stock</span>;
  if (s === 'low_stock') return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-warning"><AlertTriangle className="h-3 w-3" />Low Stock</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] font-medium text-danger"><XCircle className="h-3 w-3" />Out of Stock</span>;
};

export default function InventoryPage() {
  const [tab, setTab] = useState<'inventory' | 'orders' | 'suppliers'>('inventory');
  const [search, setSearch] = useState('');

  const filteredParts = parts.filter((p) => !search || p.pn.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-base">
      <TopBar title="Inventory & Procurement" />
      <div className="page-enter p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-subtle">
          {([['inventory', 'Inventory'], ['orders', 'Pending Orders'], ['suppliers', 'Suppliers']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${tab === key ? 'border-accent text-text-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'inventory' && (
          <>
            {/* Alert */}
            <div className="rounded-lg border border-warning/30 bg-warning-subtle p-4 flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-warning shrink-0" />
              <div>
                <div className="text-[13px] font-medium text-text-primary mb-0.5">Stage 3 Defect Detected — Blade #15, N-737CD</div>
                <div className="text-[12px] text-text-secondary mb-2">Part: <span className="font-mono">CFM56-5B-L28410</span> · Status: 0 units in stock</div>
                <div className="flex gap-2">
                  <button className="rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-accent-hover transition-colors">Raise Purchase Request</button>
                  <button className="rounded-md border border-border-default px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary transition-colors">View Inventory</button>
                </div>
              </div>
            </div>

            <div className="relative max-w-[320px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts..." className="w-full rounded-md border border-border-subtle bg-elevated pl-9 pr-3 py-2 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent" />
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-border-subtle">
                  {['Part #', 'Description', 'Manufacturer', 'Qty', 'Min', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-text-tertiary whitespace-nowrap" style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{filteredParts.map((p) => (
                  <tr key={p.pn} className="border-b border-border-subtle last:border-0 hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-[13px] text-text-primary">{p.pn}</td>
                    <td className="px-4 py-3 text-[13px] text-text-secondary">{p.desc}</td>
                    <td className="px-4 py-3 text-[13px] text-text-tertiary">{p.mfr}</td>
                    <td className="px-4 py-3 text-[13px] text-text-primary font-mono">{p.qty}</td>
                    <td className="px-4 py-3 text-[13px] text-text-tertiary font-mono">{p.min}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <div className="space-y-3">
            {dummyOrders.map((o) => (
              <div key={o.id} className="rounded-lg border border-border-subtle bg-surface p-5 hover:border-border-default transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono text-[14px] font-medium text-text-primary">{o.id}</span>
                    <span className={`ml-3 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${o.priority === 'critical' ? 'bg-danger-subtle text-danger' : o.priority === 'urgent' ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info'}`}>{o.priority}</span>
                  </div>
                  <span className={`text-[12px] font-medium capitalize ${o.status === 'shipped' ? 'text-success' : o.status === 'approved' ? 'text-accent' : 'text-warning'}`}>{o.status}</span>
                </div>
                <div className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                  <div><span className="text-text-tertiary">Part:</span> <span className="font-mono text-text-primary">{o.pn}</span></div>
                  <div><span className="text-text-tertiary">Qty:</span> <span className="text-text-primary">{o.qty} units</span></div>
                  <div><span className="text-text-tertiary">Supplier:</span> <span className="text-text-primary">{o.supplier}</span></div>
                  <div><span className="text-text-tertiary">Requested:</span> <span className="text-text-primary">{o.date}</span></div>
                  <div><span className="text-text-tertiary">ETA:</span> <span className="text-text-primary">{o.eta}</span></div>
                  <div><span className="text-text-tertiary">Cost:</span> <span className="text-text-primary">${o.cost.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'suppliers' && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((s) => (
              <div key={s.name} className="rounded-lg border border-border-subtle bg-surface p-5 hover:border-border-default transition-colors">
                <div className="text-[15px] font-medium text-text-primary mb-1">{s.name}</div>
                <div className="text-[12px] text-text-tertiary mb-3">{s.location}</div>
                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between"><span className="text-text-tertiary">Lead Time</span><span className="text-text-primary">{s.leadTime}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Rating</span><span className="flex items-center gap-1 text-warning"><Star className="h-3 w-3 fill-current" />{s.rating}</span></div>
                  <div className="flex justify-between"><span className="text-text-tertiary">Contact</span><span className="text-accent text-[12px]">{s.email}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
