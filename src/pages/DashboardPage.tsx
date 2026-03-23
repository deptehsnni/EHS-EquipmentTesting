import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import {
  Equipment, mapDbToEquipment, getRiksaUjiStatus, getRiksaUjiColor,
  riksaUjiStatusLabel, formatDateShort,
} from '../types';
import {
  Package, CheckCircle2, AlertTriangle, XCircle, ChevronRight,
  BarChart2, TrendingUp, Download, FileSpreadsheet, FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── Hooks ────────────────────────────────────────────────────────────────────

const useIsMobile = () => {
  const [isMob, setIsMob] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setIsMob(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMob;
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}> = ({ data, total, size = 120 }) => {
  const r = 48; const cx = 56; const cy = 56;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map(d => {
    const pct = total > 0 ? d.value / total : 0;
    const dash = pct * circ;
    const seg = { ...d, dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 112 112">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={12} />
      {segments.map((s, i) => s.dash > 0 ? (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={12}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset + circ / 4}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      ) : null)}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="800"
        fill="var(--ink)" fontFamily="var(--font-sans)">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="var(--ink-3)"
        fontWeight="600" fontFamily="var(--font-sans)" letterSpacing="0.05em">TOTAL</text>
    </svg>
  );
};

// ─── Export helpers ───────────────────────────────────────────────────────────

const exportExcel = (equipments: Equipment[]) => {
  const now = new Date();
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const summary = [
    ['LAPORAN EHS EQUIPMENT TESTING'],
    ['Tanggal', now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
    [],
    ['Status', 'Jumlah', 'Persentase'],
    ['Aktif', aktif, total > 0 ? `${Math.round((aktif / total) * 100)}%` : '0%'],
    ['Segera Habis', warning, total > 0 ? `${Math.round((warning / total) * 100)}%` : '0%'],
    ['Expired', expired, total > 0 ? `${Math.round((expired / total) * 100)}%` : '0%'],
    ['Belum Diisi', unknown, total > 0 ? `${Math.round((unknown / total) * 100)}%` : '0%'],
    ['TOTAL', total, '100%'],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

  // All inventory sheet
  const rows = equipments.map(e => ({
    'No. Peralatan': e.equipmentNo,
    'Nama': e.equipmentName,
    'Kategori': e.category,
    'Tipe': e.equipmentType,
    'Merk': e.brand,
    'Departemen': e.department,
    'Riksa Uji Terakhir': e.lastInspectionDate || '-',
    'Masa Berlaku': e.validityPeriod || '-',
    'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
    'Status Riksa Uji': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
  }));
  const ws2 = XLSX.utils.json_to_sheet(rows);
  ws2['!cols'] = Object.keys(rows[0] || {}).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws2, 'Semua Peralatan');

  // Urgent sheet
  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));
  if (urgent.length > 0) {
    const urgentRows = urgent.map(e => ({
      'Prioritas': getRiksaUjiStatus(e.nextInspectionDate) === 'expired' ? 'EXPIRED' : 'SEGERA HABIS',
      'No. Peralatan': e.equipmentNo,
      'Nama': e.equipmentName,
      'Departemen': e.department,
      'Jatuh Tempo': e.nextInspectionDate || '-',
    }));
    const ws3 = XLSX.utils.json_to_sheet(urgentRows);
    ws3['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Perlu Perhatian');
  }

  XLSX.writeFile(wb, `Laporan_EHS_${now.toISOString().split('T')[0]}.xlsx`);
};

const exportPDF = (equipments: Equipment[]) => {
  const now = new Date();
  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:32px;font-size:12px;}
  h1{font-size:20px;font-weight:800;margin-bottom:4px;}
  .sub{color:#6b7280;margin-bottom:24px;}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
  .stat{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;}
  .stat-val{font-size:24px;font-weight:800;}
  .stat-label{font-size:11px;color:#6b7280;margin-top:2px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;background:#f9fafb;border-bottom:1px solid #e5e7eb;}
  td{padding:9px 10px;border-bottom:1px solid #f3f4f6;font-size:11px;}
  .sec{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:20px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;}
  footer{margin-top:32px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px;display:flex;justify-content:space-between;}
  @media print{body{padding:16px;}}
</style></head><body>
<h1>Laporan EHS Equipment Testing</h1>
<p class="sub">Dicetak ${now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${now.toLocaleTimeString('id-ID')}</p>
<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#2D6BE4">${total}</div><div class="stat-label">Total Peralatan</div></div>
  <div class="stat"><div class="stat-val" style="color:#16a34a">${aktif}</div><div class="stat-label">Aktif</div></div>
  <div class="stat"><div class="stat-val" style="color:#d97706">${warning}</div><div class="stat-label">Segera Habis</div></div>
  <div class="stat"><div class="stat-val" style="color:#dc2626">${expired}</div><div class="stat-label">Expired</div></div>
</div>
${urgent.length > 0 ? `
<p class="sec">Perlu Perhatian (${urgent.length})</p>
<table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Departemen</th><th>Jatuh Tempo</th><th>Status</th></tr></thead><tbody>
${urgent.map(e => {
  const s = getRiksaUjiStatus(e.nextInspectionDate);
  return `<tr>
    <td style="font-family:monospace;font-weight:700">${e.equipmentNo}</td>
    <td>${e.equipmentName||'-'}</td><td>${e.department||'-'}</td>
    <td style="font-weight:600;color:${s==='expired'?'#dc2626':'#d97706'}">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td>
    <td style="color:${s==='expired'?'#dc2626':'#d97706'};font-weight:700">${riksaUjiStatusLabel[s]}</td>
  </tr>`;
}).join('')}
</tbody></table>` : '<p style="color:#16a34a;font-weight:600;margin:16px 0">Tidak ada peralatan yang memerlukan perhatian segera.</p>'}
<p class="sec">Semua Peralatan</p>
<table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th></tr></thead><tbody>
${equipments.slice(0,50).map(e => {
  const s = getRiksaUjiStatus(e.nextInspectionDate);
  const c = {active:'#16a34a',warning:'#d97706',expired:'#dc2626',unknown:'#6b7280'}[s];
  return `<tr>
    <td style="font-family:monospace;font-weight:700">${e.equipmentNo}</td>
    <td>${e.equipmentName||'-'}</td><td>${e.category}</td><td>${e.department||'-'}</td>
    <td style="color:${c};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td>
    <td style="color:${c}">${riksaUjiStatusLabel[s]}</td>
  </tr>`;
}).join('')}
</tbody></table>
${equipments.length>50?`<p style="font-size:10px;color:#9ca3af;margin-top:6px">* ${equipments.length} peralatan total. Export Excel untuk data lengkap.</p>`:''}
<footer><span>EHS Equipment Testing System</span><span>${now.getFullYear()}</span></footer>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'laporan'>('overview');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('equipments').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;
  const perluPerhatian = useMemo(() =>
    equipments.filter(e => ['warning', 'expired'].includes(getRiksaUjiStatus(e.nextInspectionDate)))
      .sort((a, b) => {
        const da = a.nextInspectionDate ? new Date(a.nextInspectionDate).getTime() : Infinity;
        const db = b.nextInspectionDate ? new Date(b.nextInspectionDate).getTime() : Infinity;
        return da - db;
      }), [equipments]);
  const recent = equipments.slice(0, 5);
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = user?.fullName?.split(' ')[0] || 'Pengguna';

  const statusData = [
    { label: 'Aktif', value: aktif, color: '#16A34A' },
    { label: 'Segera Habis', value: warning, color: '#D97706' },
    { label: 'Expired', value: expired, color: '#DC2626' },
    { label: 'Belum Diisi', value: unknown, color: '#9CA3AF' },
  ];

  const categories = useMemo(() => Array.from(new Set(equipments.map(e => e.category))), [equipments]);
  const categoryData = useMemo(() => categories.map(cat => {
    const items = equipments.filter(e => e.category === cat);
    return {
      label: cat,
      aktif: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length,
      warning: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length,
      expired: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length,
      total: items.length,
    };
  }), [equipments, categories]);

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F2F2F7', minHeight: '100vh' }}>
        {/* Hero */}
        <div className="mobile-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 4 }}>{today}</p>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
              Hai, {firstName} 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Ringkasan sistem EHS hari ini</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20, position: 'relative', zIndex: 1 }}>
            {[
              { label: 'Total Alat', value: total, color: 'rgba(255,255,255,0.9)' },
              { label: 'Aktif', value: aktif, color: '#6EE7B7' },
              { label: 'Segera Habis', value: warning, color: '#FCD34D' },
              { label: 'Expired', value: expired, color: '#FCA5A5' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 16px', backdropFilter: 'blur(10px)' }}>
                <p style={{ color: s.color, fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{loading ? '—' : s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ background: '#fff', padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 8 }}>
          {[{ key: 'overview', label: 'Ringkasan' }, { key: 'laporan', label: 'Statistik' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
              padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'var(--accent)' : '#F3F4F6',
              color: activeTab === t.key ? '#fff' : '#6B7280',
            }}>{t.label}</button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={() => exportExcel(equipments)} style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 8, padding: '7px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button onClick={() => exportPDF(equipments)} style={{ background: '#EEF3FD', color: '#2D6BE4', border: '1px solid #BFDBFE', borderRadius: 8, padding: '7px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>

        <div style={{ padding: '12px 16px' }}>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <>
              {expired > 0 && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 10, display: 'flex', gap: 10 }}>
                  <XCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>{expired} peralatan riksa uji EXPIRED</p>
                  </div>
                  <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Lihat</button>
                </div>
              )}
              {warning > 0 && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '12px 16px', marginBottom: 12, display: 'flex', gap: 10 }}>
                  <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{warning} riksa uji kurang dari 3 bulan</p>
                  </div>
                  <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>Lihat</button>
                </div>
              )}
              {perluPerhatian.length > 0 && (
                <div className="m-card" style={{ marginBottom: 12 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Perlu Perhatian</p>
                    <button onClick={() => navigate('/inventory')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
                  </div>
                  {perluPerhatian.slice(0, 4).map((e, i, arr) => {
                    const s = getRiksaUjiStatus(e.nextInspectionDate);
                    return (
                      <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: s === 'expired' ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{e.equipmentNo}</p>
                          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{e.equipmentName} · {formatDateShort(e.nextInspectionDate)}</p>
                        </div>
                        <ChevronRight size={14} color="#D1D5DB" />
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="m-card" style={{ marginBottom: 12 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Aktivitas Terbaru</p>
                </div>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                ) : recent.map((e, i, arr) => (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 32, height: 32, background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={14} color="#9CA3AF" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>{e.equipmentNo}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{formatDateShort(e.updatedAt)}</p>
                    </div>
                    <ChevronRight size={13} color="#D1D5DB" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── STATISTIK TAB ── */}
          {activeTab === 'laporan' && (
            <>
              <div className="m-card" style={{ padding: 16, marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 16 }}>Distribusi Status Riksa Uji</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <DonutChart data={statusData} total={total} size={100} />
                  <div style={{ flex: 1 }}>
                    {statusData.map(s => (
                      <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color }} />
                          <span style={{ fontSize: 12, color: '#374151' }}>{s.label}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {statusData.map(s => (
                  <div key={s.label} style={{ marginBottom: 5 }}>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {categoryData.length > 0 && (
                <div className="m-card" style={{ padding: 16, marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111', marginBottom: 14 }}>Per Kategori</p>
                  {categoryData.map((cat, i) => (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{cat.label}</span>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{cat.total} alat</span>
                      </div>
                      <div style={{ display: 'flex', height: 16, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6' }}>
                        {cat.aktif > 0 && <div style={{ width: `${(cat.aktif / cat.total) * 100}%`, background: '#16A34A' }} />}
                        {cat.warning > 0 && <div style={{ width: `${(cat.warning / cat.total) * 100}%`, background: '#D97706' }} />}
                        {cat.expired > 0 && <div style={{ width: `${(cat.expired / cat.total) * 100}%`, background: '#DC2626' }} />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {perluPerhatian.length > 0 && (
                <div className="m-card" style={{ marginBottom: 12 }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>Perlu Perhatian ({perluPerhatian.length})</p>
                  </div>
                  {perluPerhatian.map((e, i, arr) => {
                    const s = getRiksaUjiStatus(e.nextInspectionDate);
                    return (
                      <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none', cursor: 'pointer' }}>
                        <div style={{ width: 4, height: 40, background: s === 'expired' ? '#DC2626' : '#D97706', borderRadius: 99, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111', fontFamily: 'monospace' }}>{e.equipmentNo}</p>
                          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{e.equipmentName} · {formatDateShort(e.nextInspectionDate)}</p>
                        </div>
                        <ChevronRight size={14} color="#D1D5DB" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );

  // ── PC ───────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 4 }}>{today}</p>
            <h1 className="text-display">Hai, {firstName} 👋</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Tab pills */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', gap: 2 }}>
              <button onClick={() => setActiveTab('overview')} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: activeTab === 'overview' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'overview' ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: activeTab === 'overview' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>Ringkasan</button>
              <button onClick={() => setActiveTab('laporan')} style={{
                padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: activeTab === 'laporan' ? 'var(--surface)' : 'transparent',
                color: activeTab === 'laporan' ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: activeTab === 'laporan' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}><BarChart2 size={13} /> Statistik</button>
            </div>
            {/* Export */}
            <div style={{ position: 'relative' }} ref={exportRef}>
              <button onClick={() => setExportOpen(o => !o)} className="btn btn-secondary" style={{ gap: 6 }}>
                <Download size={14} /> Export <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button className="export-menu-item" onClick={() => { exportExcel(equipments); setExportOpen(false); }}>
                    <FileSpreadsheet size={15} color="#16A34A" /> Export Excel (.xlsx)
                  </button>
                  <button className="export-menu-item" onClick={() => { exportPDF(equipments); setExportOpen(false); }}>
                    <FileText size={15} color="#DC2626" /> Cetak / Simpan PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(expired > 0 || warning > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {expired > 0 && (
              <div className="notif notif-danger" style={{ fontSize: 13 }}>
                <XCircle size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{expired} peralatan</strong> riksa uji sudah EXPIRED</span>
                <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--red)' }}>Lihat →</button>
              </div>
            )}
            {warning > 0 && (
              <div className="notif notif-warning" style={{ fontSize: 13 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{warning} peralatan</strong> riksa uji kurang dari 3 bulan</span>
                <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--amber)' }}>Lihat →</button>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Peralatan', value: total, icon: Package, color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'Riksa Uji Aktif', value: aktif, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-bg)' },
            { label: 'Segera Habis', value: warning, icon: AlertTriangle, color: 'var(--amber)', bg: 'var(--amber-bg)' },
            { label: 'Expired', value: expired, icon: XCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, background: s.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon size={17} color={s.color} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>
                  {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '-'}
                </span>
              </div>
              <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{loading ? '—' : s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            {/* Perlu Perhatian */}
            <div className="surface" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-header"><h2 className="text-heading">Perlu Perhatian</h2></div>
                <button onClick={() => navigate('/inventory')} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                  Lihat Semua <ChevronRight size={13} />
                </button>
              </div>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
              ) : perluPerhatian.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <CheckCircle2 size={32} color="var(--green)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Semua riksa uji dalam kondisi baik</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>No. Peralatan</th><th>Nama</th><th>Departemen</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
                  <tbody>
                    {perluPerhatian.map(e => {
                      const s = getRiksaUjiStatus(e.nextInspectionDate);
                      return (
                        <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{e.equipmentNo}</span></td>
                          <td style={{ color: 'var(--ink)' }}>{e.equipmentName || '-'}</td>
                          <td style={{ color: 'var(--ink-3)' }}>{e.department || '-'}</td>
                          <td style={{ fontWeight: 500, color: s === 'expired' ? 'var(--red)' : 'var(--amber)' }}>{formatDateShort(e.nextInspectionDate)}</td>
                          <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Right panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="surface" style={{ padding: 20 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <h2 className="text-heading">Ringkasan Riksa Uji</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {statusData.map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.value}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, background: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface" style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div className="section-header"><h2 className="text-heading">Aktivitas Terbaru</h2></div>
                </div>
                <div>
                  {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                  ) : recent.map((e, i, arr) => (
                    <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ padding: '11px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={el => (el.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={13} color="var(--ink-3)" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{formatDateShort(e.updatedAt)}</p>
                      </div>
                      <ChevronRight size={13} color="var(--border-2)" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STATISTIK TAB ── */}
        {activeTab === 'laporan' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
            {/* Donut + bar chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="surface" style={{ padding: 24 }}>
                <div className="section-header" style={{ marginBottom: 20 }}>
                  <h2 className="text-heading">Distribusi Status Riksa Uji</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                  <DonutChart data={statusData} total={total} size={140} />
                  <div style={{ flex: 1 }}>
                    {statusData.map(s => (
                      <div key={s.label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s.label}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink-3)', width: 32, textAlign: 'right' }}>{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
                          </div>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%`, background: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {categoryData.length > 0 && (
                <div className="surface" style={{ padding: 24 }}>
                  <div className="section-header" style={{ marginBottom: 20 }}>
                    <h2 className="text-heading">Per Kategori</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {categoryData.map((cat, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 40px', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{cat.label}</span>
                        <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)' }}>
                          {cat.aktif > 0 && <div title={`Aktif: ${cat.aktif}`} style={{ width: `${(cat.aktif / cat.total) * 100}%`, background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{cat.aktif}</div>}
                          {cat.warning > 0 && <div title={`Segera Habis: ${cat.warning}`} style={{ width: `${(cat.warning / cat.total) * 100}%`, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{cat.warning}</div>}
                          {cat.expired > 0 && <div title={`Expired: ${cat.expired}`} style={{ width: `${(cat.expired / cat.total) * 100}%`, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{cat.expired}</div>}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right' }}>{cat.total}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    {[{ label: 'Aktif', color: '#16A34A' }, { label: 'Segera Habis', color: '#D97706' }, { label: 'Expired', color: '#DC2626' }].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: perlu perhatian */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="surface" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="section-header"><h2 className="text-heading">Perlu Perhatian</h2></div>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{perluPerhatian.length}</span>
                </div>
                {perluPerhatian.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <CheckCircle2 size={28} color="var(--green)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Semua aman</p>
                  </div>
                ) : perluPerhatian.map((e, i, arr) => {
                  const s = getRiksaUjiStatus(e.nextInspectionDate);
                  return (
                    <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={el => (el.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 3, height: 36, background: s === 'expired' ? 'var(--red)' : 'var(--amber)', borderRadius: 99, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{formatDateShort(e.nextInspectionDate)}</p>
                      </div>
                      <span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
