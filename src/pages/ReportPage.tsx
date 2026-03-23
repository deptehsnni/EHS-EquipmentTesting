import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, riksaUjiStatusLabel, formatDateShort } from '../types';
import { BarChart2, Download, FileText, FileSpreadsheet, TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock, ChevronRight, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'category' | 'expiring';

// ─── Donut Chart ──────────────────────────────────────────────────────────────

const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  total: number;
  size?: number;
}> = ({ data, total, size = 140 }) => {
  const r = 50; const cx = 60; const cy = 60;
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
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={14} />
      {segments.map((s, i) => (
        s.dash > 0 ? (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={14}
            strokeDasharray={`${s.dash} ${circ - s.dash}`}
            strokeDashoffset={-s.offset + circ / 4}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          />
        ) : null
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink)">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--ink-3)" fontWeight="600">TOTAL</text>
    </svg>
  );
};

// ─── Bar Chart ─────────────────────────────────────────────────────────────── 

const BarChartComp: React.FC<{
  data: { label: string; values: { v: number; color: string; key: string }[] }[];
  maxVal: number;
}> = ({ data, maxVal }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-2)', textAlign: 'right', fontWeight: 500 }}>{row.label}</span>
          <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)', gap: 1 }}>
            {row.values.map((v, j) => (
              v.v > 0 ? (
                <div key={j} title={`${riksaUjiStatusLabel[v.key as any] || v.key}: ${v.v}`}
                  style={{
                    width: `${maxVal > 0 ? (v.v / maxVal) * 100 : 0}%`,
                    background: v.color, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', fontWeight: 700,
                    minWidth: v.v > 0 ? 20 : 0,
                  }}>
                  {v.v > 0 ? v.v : ''}
                </div>
              ) : null
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Export Functions ─────────────────────────────────────────────────────────

const exportToExcel = (equipments: Equipment[], filtered: Equipment[], tab: TabKey) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary
  const now = new Date();
  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const summaryData = [
    ['LAPORAN EHS EQUIPMENT TESTING', '', '', ''],
    ['Tanggal Cetak', now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), '', ''],
    ['Waktu Cetak', now.toLocaleTimeString('id-ID'), '', ''],
    ['', '', '', ''],
    ['RINGKASAN STATUS RIKSA UJI', '', '', ''],
    ['Status', 'Jumlah', 'Persentase', ''],
    ['Aktif', aktif, total > 0 ? `${Math.round((aktif / total) * 100)}%` : '0%', ''],
    ['Segera Habis (< 3 Bulan)', warning, total > 0 ? `${Math.round((warning / total) * 100)}%` : '0%', ''],
    ['Expired', expired, total > 0 ? `${Math.round((expired / total) * 100)}%` : '0%', ''],
    ['Belum Diisi', unknown, total > 0 ? `${Math.round((unknown / total) * 100)}%` : '0%', ''],
    ['TOTAL', total, '100%', ''],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // Sheet 2: All Inventory
  const invRows = equipments.map(e => ({
    'No. Peralatan': e.equipmentNo,
    'Nama Peralatan': e.equipmentName,
    'Kategori': e.category,
    'Tipe / Model': e.equipmentType,
    'Merk': e.brand,
    'Tahun Buat': e.manufactureYear,
    'Departemen': e.department,
    'Status Kondisi': e.status,
    'Riksa Uji Terakhir': e.lastInspectionDate || '-',
    'Masa Berlaku': e.validityPeriod || '-',
    'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
    'Status Riksa Uji': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
    'Jumlah Inspeksi': e.inspections?.length || 0,
  }));
  const wsInv = XLSX.utils.json_to_sheet(invRows);
  wsInv['!cols'] = Object.keys(invRows[0] || {}).map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsInv, 'Semua Peralatan');

  // Sheet 3: Expired & Warning
  const urgentRows = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate))).map(e => ({
    'Prioritas': getRiksaUjiStatus(e.nextInspectionDate) === 'expired' ? '🔴 EXPIRED' : '🟡 SEGERA HABIS',
    'No. Peralatan': e.equipmentNo,
    'Nama Peralatan': e.equipmentName,
    'Departemen': e.department,
    'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
    'Status Riksa Uji': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
  }));
  if (urgentRows.length > 0) {
    const wsUrgent = XLSX.utils.json_to_sheet(urgentRows);
    wsUrgent['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsUrgent, 'Perlu Perhatian');
  }

  XLSX.writeFile(wb, `Laporan_EHS_${now.toISOString().split('T')[0]}.xlsx`);
};

const exportToPDF = (equipments: Equipment[]) => {
  const now = new Date();
  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;
  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 4px; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 32px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin: 28px 0 12px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
  .stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 8px; }
  .stat-box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
  .stat-val { font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
  .stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .c-aktif { color: #16a34a; } .c-warning { color: #d97706; } .c-expired { color: #dc2626; } .c-unknown { color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  td { padding: 10px 12px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
  .b-expired { background: #fef2f2; color: #dc2626; }
  .b-warning { background: #fffbeb; color: #d97706; }
  footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <h1>Laporan EHS Equipment Testing</h1>
  <p class="subtitle">Dicetak pada ${now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${now.toLocaleTimeString('id-ID')}</p>

  <div class="section-title">Ringkasan Status Riksa Uji</div>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-val c-aktif">${aktif}</div><div class="stat-label">Aktif</div></div>
    <div class="stat-box"><div class="stat-val c-warning">${warning}</div><div class="stat-label">Segera Habis</div></div>
    <div class="stat-box"><div class="stat-val c-expired">${expired}</div><div class="stat-label">Expired</div></div>
    <div class="stat-box"><div class="stat-val c-unknown">${unknown}</div><div class="stat-label">Belum Diisi</div></div>
  </div>
  <p style="font-size:12px;color:#6b7280;margin-top:8px">Total ${total} peralatan terdaftar</p>

  ${urgent.length > 0 ? `
  <div class="section-title">Peralatan Memerlukan Perhatian (${urgent.length})</div>
  <table>
    <thead><tr><th>No. Peralatan</th><th>Nama</th><th>Departemen</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
    <tbody>
      ${urgent.map(e => {
        const s = getRiksaUjiStatus(e.nextInspectionDate);
        return `<tr>
          <td style="font-family:monospace;font-weight:700">${e.equipmentNo}</td>
          <td>${e.equipmentName || '-'}</td>
          <td>${e.department || '-'}</td>
          <td style="font-weight:600;color:${s === 'expired' ? '#dc2626' : '#d97706'}">${e.nextInspectionDate ? new Date(e.nextInspectionDate).toLocaleDateString('id-ID') : '-'}</td>
          <td><span class="badge ${s === 'expired' ? 'b-expired' : 'b-warning'}">${riksaUjiStatusLabel[s]}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>` : '<p style="color:#16a34a;font-weight:600;margin-top:8px">✓ Tidak ada peralatan yang memerlukan perhatian segera.</p>'}

  <div class="section-title">Semua Peralatan</div>
  <table>
    <thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th></tr></thead>
    <tbody>
      ${equipments.slice(0, 50).map(e => {
        const s = getRiksaUjiStatus(e.nextInspectionDate);
        const colors = { active: '#16a34a', warning: '#d97706', expired: '#dc2626', unknown: '#6b7280' };
        return `<tr>
          <td style="font-family:monospace;font-weight:700">${e.equipmentNo}</td>
          <td>${e.equipmentName || '-'}</td>
          <td>${e.category}</td>
          <td>${e.department || '-'}</td>
          <td style="color:${colors[s]};font-weight:600">${e.nextInspectionDate ? new Date(e.nextInspectionDate).toLocaleDateString('id-ID') : '-'}</td>
          <td><span class="badge ${s === 'active' ? 'b-aktif' : s === 'warning' ? 'b-warning' : s === 'expired' ? 'b-expired' : ''}" style="background:${s === 'active' ? '#f0fdf4' : s === 'warning' ? '#fffbeb' : s === 'expired' ? '#fef2f2' : '#f9fafb'};color:${colors[s]}">${riksaUjiStatusLabel[s]}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  ${equipments.length > 50 ? `<p style="font-size:11px;color:#9ca3af;margin-top:8px">* Menampilkan 50 dari ${equipments.length} peralatan. Export Excel untuk data lengkap.</p>` : ''}

  <footer>
    <span>EHS Equipment Testing System · Laporan Otomatis</span>
    <span>Halaman 1</span>
  </footer>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const useIsMobile = () => {
  const [isMob, setIsMob] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setIsMob(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return isMob;
};

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('equipments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  // Close export menu on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const total = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const statusData = [
    { label: 'Aktif', value: aktif, color: '#16A34A' },
    { label: 'Segera Habis', value: warning, color: '#D97706' },
    { label: 'Expired', value: expired, color: '#DC2626' },
    { label: 'Belum Diisi', value: unknown, color: '#9CA3AF' },
  ];

  // Per-category breakdown
  const categories = useMemo(() => Array.from(new Set(equipments.map(e => e.category))), [equipments]);
  const categoryData = useMemo(() => categories.map(cat => {
    const items = equipments.filter(e => e.category === cat);
    return {
      label: cat,
      values: [
        { v: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length, color: '#16A34A', key: 'active' },
        { v: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length, color: '#D97706', key: 'warning' },
        { v: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length, color: '#DC2626', key: 'expired' },
        { v: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length, color: '#D1D5DB', key: 'unknown' },
      ],
      total: items.length,
    };
  }), [equipments, categories]);

  const maxCategoryTotal = Math.max(...categoryData.map(c => c.total), 1);

  // Expiring within 90 days
  const expiringItems = useMemo(() => equipments
    .filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)))
    .sort((a, b) => {
      const da = a.nextInspectionDate ? new Date(a.nextInspectionDate).getTime() : 0;
      const db = b.nextInspectionDate ? new Date(b.nextInspectionDate).getTime() : 0;
      return da - db;
    }), [equipments]);

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Ikhtisar', icon: BarChart2 },
    { key: 'category', label: 'Per Kategori', icon: TrendingUp },
    { key: 'expiring', label: `Perlu Perhatian ${expiringItems.length > 0 ? `(${expiringItems.length})` : ''}`, icon: AlertTriangle },
  ];

  // ── MOBILE ────────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F2F2F7', minHeight: '100vh' }}>
        <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: 22, color: '#111', letterSpacing: '-0.02em' }}>Laporan</h1>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Statistik & Analisis</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => exportToExcel(equipments, expiringItems, tab)} style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button onClick={() => exportToPDF(equipments)} style={{ background: '#EEF3FD', color: '#2D6BE4', border: '1px solid #BFDBFE', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab === t.key ? 'var(--accent)' : '#F3F4F6',
                color: tab === t.key ? '#fff' : '#6B7280',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  {/* Donut + Stats */}
                  <div className="m-card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                      <DonutChart data={statusData} total={total} size={110} />
                      <div style={{ flex: 1 }}>
                        {statusData.map(s => (
                          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                              <span style={{ fontSize: 12, color: '#374151' }}>{s.label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {statusData.map(s => (
                      <div key={s.label} style={{ marginBottom: 6 }}>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${total > 0 ? (s.value / total) * 100 : 0}%`, background: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Alert */}
                  {(expired > 0 || warning > 0) && (
                    <div className="m-card" style={{ marginBottom: 12 }}>
                      {expired > 0 && (
                        <div style={{ padding: '12px 16px', display: 'flex', gap: 10, borderBottom: warning > 0 ? '1px solid #F9FAFB' : 'none' }}>
                          <XCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>{expired} Peralatan Expired</p>
                            <p style={{ fontSize: 12, color: '#B91C1C', opacity: 0.8, marginTop: 2 }}>Segera lakukan riksa uji ulang</p>
                          </div>
                          <button onClick={() => setTab('expiring')} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Lihat</button>
                        </div>
                      )}
                      {warning > 0 && (
                        <div style={{ padding: '12px 16px', display: 'flex', gap: 10 }}>
                          <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{warning} Segera Jatuh Tempo</p>
                          </div>
                          <button onClick={() => setTab('expiring')} style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Lihat</button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {tab === 'category' && (
                <div className="m-card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 16 }}>Breakdown per Kategori</p>
                  {categoryData.map((cat, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{cat.label}</span>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{cat.total} alat</span>
                      </div>
                      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', background: '#F3F4F6' }}>
                        {cat.values.map((v, j) => v.v > 0 ? (
                          <div key={j} style={{ width: `${(v.v / cat.total) * 100}%`, background: v.color, transition: 'width 0.8s ease' }} />
                        ) : null)}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        {cat.values.map((v, j) => v.v > 0 ? (
                          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: v.color }} />
                            <span style={{ fontSize: 11, color: '#6B7280' }}>{v.v}</span>
                          </div>
                        ) : null)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'expiring' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {expiringItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 16px' }}>
                      <CheckCircle2 size={36} color="#16A34A" style={{ margin: '0 auto 12px' }} />
                      <p style={{ fontWeight: 600, color: '#111' }}>Semua Aman!</p>
                      <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Tidak ada peralatan yang perlu perhatian</p>
                    </div>
                  ) : expiringItems.map(e => {
                    const s = getRiksaUjiStatus(e.nextInspectionDate);
                    return (
                      <div key={e.id} className="m-card-pressable" onClick={() => navigate(`/inventory/${e.id}`)}>
                        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 4, height: 44, background: s === 'expired' ? '#DC2626' : '#D97706', borderRadius: 99, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#111' }}>{e.equipmentNo}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: s === 'expired' ? '#DC2626' : '#D97706' }}>
                                {formatDateShort(e.nextInspectionDate)}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: '#374151', marginBottom: 2 }}>{e.equipmentName || '-'}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{e.department || '-'}</p>
                          </div>
                          <ChevronRight size={16} color="#D1D5DB" flexShrink={0} />
                        </div>
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

  // ── PC ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 className="text-display">Laporan & Statistik</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 6 }}>
              Analisis status riksa uji per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={exportRef}>
            <button onClick={() => setExportOpen(o => !o)} className="btn btn-secondary" style={{ gap: 6 }}>
              <Download size={14} /> Export
              <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button className="export-menu-item" onClick={() => { exportToExcel(equipments, expiringItems, tab); setExportOpen(false); }}>
                  <FileSpreadsheet size={15} color="#16A34A" /> Export Excel (.xlsx)
                </button>
                <button className="export-menu-item" onClick={() => { exportToPDF(equipments); setExportOpen(false); }}>
                  <FileText size={15} color="#DC2626" /> Cetak / Simpan PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-2)', padding: 4, borderRadius: 10, width: 'fit-content', border: '1px solid var(--border)' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`report-tab ${tab === t.key ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="spinner" /></div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === 'overview' && (
              <>
                {/* Stat Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
                  {[
                    { label: 'Total Peralatan', value: total, sub: 'terdaftar', icon: BarChart2, color: 'var(--accent)', bg: 'var(--accent-light)' },
                    { label: 'Riksa Uji Aktif', value: aktif, sub: `${total > 0 ? Math.round((aktif / total) * 100) : 0}% dari total`, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-bg)' },
                    { label: 'Segera Habis', value: warning, sub: 'dalam 3 bulan', icon: Clock, color: 'var(--amber)', bg: 'var(--amber-bg)' },
                    { label: 'Expired', value: expired, sub: 'perlu tindakan', icon: XCircle, color: 'var(--red)', bg: 'var(--red-bg)' },
                  ].map(s => (
                    <div key={s.label} className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div style={{ width: 38, height: 38, background: s.bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <s.icon size={18} color={s.color} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
                          {total > 0 ? `${Math.round((s.value / total) * 100)}%` : '-'}
                        </span>
                      </div>
                      <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginTop: 6 }}>{s.label}</p>
                      <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Chart + Legend */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
                  <div className="chart-container">
                    <div className="section-header" style={{ marginBottom: 20 }}>
                      <h2 className="text-heading">Distribusi Status Riksa Uji</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                      <DonutChart data={statusData} total={total} size={160} />
                      <div style={{ flex: 1 }}>
                        {statusData.map(s => (
                          <div key={s.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="chart-legend-dot" style={{ background: s.color }} />
                                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{s.label}</span>
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

                  {/* Quick Actions */}
                  <div className="chart-container">
                    <div className="section-header" style={{ marginBottom: 16 }}>
                      <h2 className="text-heading">Tindakan Cepat</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: `${expired} peralatan Expired`, desc: 'Perlu riksa uji segera', color: 'var(--red)', icon: XCircle, filter: 'expired' },
                        { label: `${warning} akan jatuh tempo`, desc: '< 3 bulan kedepan', color: 'var(--amber)', icon: AlertTriangle, filter: 'warning' },
                        { label: `${unknown} belum ada data`, desc: 'Riksa uji belum diisi', color: 'var(--gray)', icon: Clock, filter: 'unknown' },
                      ].map((a, i) => (
                        <div key={i} onClick={() => navigate(`/inventory?filter=${a.filter}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', cursor: 'pointer', transition: 'background 0.12s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}>
                          <a.icon size={18} color={a.color} style={{ flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: a.color }}>{a.label}</p>
                            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{a.desc}</p>
                          </div>
                          <ChevronRight size={14} color="var(--border-2)" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── CATEGORY TAB ── */}
            {tab === 'category' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
                <div className="chart-container">
                  <div className="section-header" style={{ marginBottom: 4 }}>
                    <h2 className="text-heading">Status per Kategori</h2>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 24, paddingLeft: 11 }}>Hover pada bar untuk melihat detail jumlah</p>
                  <BarChartComp data={categoryData} maxVal={maxCategoryTotal} />
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    {[{ label: 'Aktif', color: '#16A34A' }, { label: 'Segera Habis', color: '#D97706' }, { label: 'Expired', color: '#DC2626' }, { label: 'Belum Diisi', color: '#D1D5DB' }].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="chart-legend-dot" style={{ background: l.color }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category list */}
                <div className="chart-container">
                  <div className="section-header" style={{ marginBottom: 16 }}>
                    <h2 className="text-heading">Ringkasan Kategori</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {categoryData.map((cat, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{cat.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{cat.total}</span>
                        </div>
                        <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--border)' }}>
                          {cat.values.map((v, j) => v.v > 0 ? (
                            <div key={j} style={{ width: `${(v.v / cat.total) * 100}%`, background: v.color }} />
                          ) : null)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── EXPIRING TAB ── */}
            {tab === 'expiring' && (
              <div>
                {expiringItems.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <CheckCircle2 size={48} color="var(--green)" style={{ margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Semua Dalam Kondisi Baik!</h2>
                    <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Tidak ada peralatan yang perlu perhatian saat ini</p>
                  </div>
                ) : (
                  <div className="surface" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="section-header">
                        <h2 className="text-heading">Peralatan Memerlukan Perhatian ({expiringItems.length})</h2>
                      </div>
                      <button onClick={() => exportToExcel(equipments, expiringItems, 'expiring')} className="btn btn-secondary btn-sm" style={{ gap: 5 }}>
                        <FileSpreadsheet size={13} /> Export
                      </button>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr><th>No. Peralatan</th><th>Nama Peralatan</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th><th></th></tr>
                      </thead>
                      <tbody>
                        {expiringItems.map(e => {
                          const s = getRiksaUjiStatus(e.nextInspectionDate);
                          return (
                            <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                              <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>{e.equipmentNo}</span></td>
                              <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{e.equipmentName || '-'}</td>
                              <td>{e.department || '-'}</td>
                              <td style={{ fontWeight: 600, color: s === 'expired' ? 'var(--red)' : 'var(--amber)' }}>{formatDateShort(e.nextInspectionDate)}</td>
                              <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                              <td><ChevronRight size={14} color="var(--border-2)" /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};
