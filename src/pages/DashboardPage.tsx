import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import {
  Equipment, mapDbToEquipment, getRiksaUjiStatus,
  riksaUjiStatusLabel, formatDateShort,
} from '../types';
import {
  Package, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, Download, FileSpreadsheet, FileText, Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

/* ─── Responsive hook ────────────────────────────────────────────────────── */
const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
};

/* ─── Mini donut SVG ─────────────────────────────────────────────────────── */
const Donut: React.FC<{
  data: { value: number; color: string }[];
  total: number;
  size: number;
  stroke: number;
}> = ({ data, total, size, stroke }) => {
  const r = (size - stroke) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = data.map(d => {
    const dash = total > 0 ? (d.value / total) * circ : 0;
    const s = { ...d, dash, offset };
    offset += dash;
    return s;
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      {segs.map((s, i) => s.dash > 0 ? (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="butt"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
      ) : null)}
    </svg>
  );
};

/* ─── Export Excel ───────────────────────────────────────────────────────── */
const doExportExcel = (equipments: Equipment[]) => {
  const now = new Date();
  const wb = XLSX.utils.book_new();
  const tot = equipments.length;
  const pct = (n: number) => tot > 0 ? `${Math.round((n / tot) * 100)}%` : '0%';
  const aktif   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unknown = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const ws1 = XLSX.utils.aoa_to_sheet([
    ['LAPORAN EHS EQUIPMENT TESTING'],
    ['Tanggal', now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })],
    [],
    ['Status', 'Jumlah', '%'],
    ['Aktif', aktif, pct(aktif)],
    ['Segera Habis', warning, pct(warning)],
    ['Expired', expired, pct(expired)],
    ['Belum Diisi', unknown, pct(unknown)],
    ['TOTAL', tot, '100%'],
  ]);
  ws1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');

  const ws2 = XLSX.utils.json_to_sheet(equipments.map(e => ({
    'No. Peralatan': e.equipmentNo, 'Nama': e.equipmentName, 'Kategori': e.category,
    'Departemen': e.department, 'Riksa Uji Terakhir': e.lastInspectionDate || '-',
    'Masa Berlaku': e.validityPeriod || '-', 'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
    'Status': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
  })));
  ws2['!cols'] = Array(8).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Semua Peralatan');

  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));
  if (urgent.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(urgent.map(e => ({
      'Prioritas': getRiksaUjiStatus(e.nextInspectionDate) === 'expired' ? 'EXPIRED' : 'SEGERA HABIS',
      'No. Peralatan': e.equipmentNo, 'Nama': e.equipmentName,
      'Departemen': e.department, 'Jatuh Tempo': e.nextInspectionDate || '-',
    })));
    ws3['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Perlu Perhatian');
  }
  XLSX.writeFile(wb, `Laporan_EHS_${now.toISOString().split('T')[0]}.xlsx`);
};

/* ─── Export PDF ─────────────────────────────────────────────────────────── */
const doExportPDF = (equipments: Equipment[]) => {
  const now = new Date();
  const tot     = equipments.length;
  const aktif   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warning = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const expired = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const urgent  = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111;padding:32px;font-size:12px}
  h1{font-size:18px;font-weight:700;margin-bottom:3px}p.sub{color:#666;margin-bottom:20px;font-size:12px}
  .row4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .box{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
  .num{font-size:22px;font-weight:700}.lbl{font-size:10px;color:#6b7280;margin-top:2px}
  h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid #e5e7eb}
  table{width:100%;border-collapse:collapse}
  th{padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;background:#f9fafb;border-bottom:1px solid #e5e7eb}
  td{padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:11px}
  .ok{color:#15803d;font-weight:600}.fn{font-family:monospace;font-weight:700}
  footer{margin-top:24px;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between}
  @media print{body{padding:16px}}
</style></head><body>
<h1>Laporan EHS Equipment Testing</h1>
<p class="sub">Dicetak ${now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${now.toLocaleTimeString('id-ID')}</p>
<div class="row4">
  <div class="box"><div class="num" style="color:#2563EB">${tot}</div><div class="lbl">Total Peralatan</div></div>
  <div class="box"><div class="num" style="color:#15803d">${aktif}</div><div class="lbl">Aktif</div></div>
  <div class="box"><div class="num" style="color:#b45309">${warning}</div><div class="lbl">Segera Habis</div></div>
  <div class="box"><div class="num" style="color:#b91c1c">${expired}</div><div class="lbl">Expired</div></div>
</div>
${urgent.length > 0 ? `<h2>Perlu Perhatian (${urgent.length})</h2>
<table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Departemen</th><th>Jatuh Tempo</th><th>Status</th></tr></thead><tbody>
${urgent.map(e=>{const s=getRiksaUjiStatus(e.nextInspectionDate);const c=s==='expired'?'#b91c1c':'#b45309';return`<tr><td class="fn">${e.equipmentNo}</td><td>${e.equipmentName||'-'}</td><td>${e.department||'-'}</td><td style="color:${c};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td><td style="color:${c};font-weight:600">${riksaUjiStatusLabel[s]}</td></tr>`}).join('')}
</tbody></table>` : `<p class="ok" style="margin:12px 0">✓ Tidak ada peralatan yang perlu perhatian segera.</p>`}
<h2>Semua Peralatan (${equipments.length})</h2>
<table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th></tr></thead><tbody>
${equipments.slice(0,50).map(e=>{const s=getRiksaUjiStatus(e.nextInspectionDate);const c={active:'#15803d',warning:'#b45309',expired:'#b91c1c',unknown:'#6b7280'}[s];return`<tr><td class="fn">${e.equipmentNo}</td><td>${e.equipmentName||'-'}</td><td>${e.category}</td><td>${e.department||'-'}</td><td style="color:${c};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td><td style="color:${c}">${riksaUjiStatusLabel[s]}</td></tr>`}).join('')}
</tbody></table>
${equipments.length>50?`<p style="font-size:10px;color:#9ca3af;margin-top:5px">* Export Excel untuk data lengkap (${equipments.length} peralatan).</p>`:''}
<footer><span>EHS Equipment Testing System</span><span>${now.getFullYear()}</span></footer>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

/* ─── Main ───────────────────────────────────────────────────────────────── */
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isMobile  = useIsMobile();
  const exportRef = useRef<HTMLDivElement>(null);

  const [equipments,  setEquipments]  = useState<Equipment[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [exportOpen,  setExportOpen]  = useState(false);

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

  /* stats */
  const total  = equipments.length;
  const aktif  = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warn   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const exp    = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unkn   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const urgent = useMemo(() =>
    equipments
      .filter(e => ['warning', 'expired'].includes(getRiksaUjiStatus(e.nextInspectionDate)))
      .sort((a, b) => {
        const da = a.nextInspectionDate ? new Date(a.nextInspectionDate).getTime() : Infinity;
        const db = b.nextInspectionDate ? new Date(b.nextInspectionDate).getTime() : Infinity;
        return da - db;
      }),
    [equipments]);

  const recent = equipments.slice(0, 6);

  const catData = useMemo(() =>
    Array.from(new Set(equipments.map(e => e.category))).map(cat => {
      const items = equipments.filter(e => e.category === cat);
      return {
        cat,
        total: items.length,
        aktif:   items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length,
        warning: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length,
        expired: items.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length,
      };
    }),
    [equipments]);

  const donut = [
    { value: aktif, color: '#16A34A' },
    { value: warn,  color: '#D97706' },
    { value: exp,   color: '#DC2626' },
    { value: unkn,  color: '#D1D5DB' },
  ];

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = user?.fullName?.split(' ')[0] || 'Pengguna';

  /* ─── LOADING ─────────────────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    </Layout>
  );

  /* ════════════════════════════════════════════════════════════════════════
     MOBILE
  ════════════════════════════════════════════════════════════════════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F0F0EE', minHeight: '100vh' }}>

        {/* Hero */}
        <div className="m-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 6 }}>{today}</p>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>
              Hai, {firstName} 👋
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Ringkasan EHS hari ini</p>
          </div>

          {/* 4 mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {[
              { label: 'Total Alat', value: total, color: 'rgba(255,255,255,0.9)' },
              { label: 'Aktif', value: aktif, color: '#86EFAC' },
              { label: 'Segera Habis', value: warn, color: '#FDE68A' },
              { label: 'Expired', value: exp, color: '#FCA5A5' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.09)', borderRadius: 12, padding: '13px 14px' }}>
                <p style={{ color: s.color, fontSize: 26, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 14px 20px' }}>

          {/* Alerts */}
          {exp > 0 && (
            <div className="notif notif-danger" style={{ marginBottom: 8, fontSize: 13 }}>
              <XCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}><strong>{exp} peralatan</strong> riksa uji EXPIRED</span>
              <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0, flexShrink: 0 }}>Lihat</button>
            </div>
          )}
          {warn > 0 && (
            <div className="notif notif-warning" style={{ marginBottom: 12, fontSize: 13 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}><strong>{warn} peralatan</strong> jatuh tempo dalam 3 bulan</span>
              <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: 'var(--amber)', cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: 0, flexShrink: 0 }}>Lihat</button>
            </div>
          )}

          {/* Donut + legend */}
          <div className="m-card" style={{ padding: 16, marginBottom: 10 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>Status Riksa Uji</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut data={donut} total={total} size={96} stroke={12} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{total}</span>
                  <span style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.05em' }}>TOTAL</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {[
                  { label: 'Aktif', value: aktif, color: '#16A34A' },
                  { label: 'Segera Habis', value: warn, color: '#D97706' },
                  { label: 'Expired', value: exp, color: '#DC2626' },
                  { label: 'Belum Diisi', value: unkn, color: '#9CA3AF' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{s.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                      <span style={{ fontSize: 11, color: 'var(--ink-4)', width: 28, textAlign: 'right' }}>{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per Kategori */}
          {catData.length > 0 && (
            <div className="m-card" style={{ padding: 16, marginBottom: 10 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>Per Kategori</p>
              {catData.map((c, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>{c.cat}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.total} alat</span>
                  </div>
                  <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--surface-3)' }}>
                    {c.aktif   > 0 && <div style={{ flex: c.aktif,   background: '#16A34A' }} />}
                    {c.warning > 0 && <div style={{ flex: c.warning, background: '#D97706' }} />}
                    {c.expired > 0 && <div style={{ flex: c.expired, background: '#DC2626' }} />}
                    {(c.total - c.aktif - c.warning - c.expired) > 0 && <div style={{ flex: (c.total - c.aktif - c.warning - c.expired), background: '#E5E7EB' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Perlu Perhatian */}
          {urgent.length > 0 && (
            <div className="m-card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Perlu Perhatian</p>
                <button onClick={() => navigate('/inventory')} style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Lihat Semua</button>
              </div>
              {urgent.slice(0, 5).map((e, i, arr) => {
                const s = getRiksaUjiStatus(e.nextInspectionDate);
                return (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 3, height: 36, borderRadius: 99, background: s === 'expired' ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                      <p className="truncate" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{e.equipmentName} · {formatDateShort(e.nextInspectionDate)}</p>
                    </div>
                    <span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Aktivitas */}
          <div className="m-card" style={{ marginBottom: 10 }}>
            <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Aktivitas Terbaru</p>
            </div>
            {recent.map((e, i, arr) => (
              <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={13} color="var(--ink-3)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                  <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{formatDateShort(e.updatedAt)}</p>
                </div>
                <ChevronRight size={14} color="var(--ink-4)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => doExportExcel(equipments)} className="btn btn-success" style={{ flex: 1, height: 42, borderRadius: 11, gap: 6 }}>
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button onClick={() => doExportPDF(equipments)} className="btn btn-secondary" style={{ flex: 1, height: 42, borderRadius: 11, gap: 6 }}>
              <FileText size={15} /> Cetak PDF
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ════════════════════════════════════════════════════════════════════════
     PC
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <Layout>
      <div style={{ padding: '28px 32px 40px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
          <div>
            <p style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 5 }}>{today}</p>
            <h1 className="text-display">Hai, {firstName} 👋</h1>
          </div>
          {/* export — fixed on the right, no overlap */}
          <div style={{ position: 'relative', flexShrink: 0 }} ref={exportRef}>
            <button onClick={() => setExportOpen(o => !o)} className="btn btn-secondary" style={{ gap: 6 }}>
              <Download size={14} /> Export
              <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 2 }}>▾</span>
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button className="export-menu-item" onClick={() => { doExportExcel(equipments); setExportOpen(false); }}>
                  <FileSpreadsheet size={14} color="#16A34A" /> Export Excel (.xlsx)
                </button>
                <button className="export-menu-item" onClick={() => { doExportPDF(equipments); setExportOpen(false); }}>
                  <FileText size={14} color="#DC2626" /> Cetak / Simpan PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Alerts ────────────────────────────────────────────────────── */}
        {(exp > 0 || warn > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {exp > 0 && (
              <div className="notif notif-danger" style={{ fontSize: 13 }}>
                <XCircle size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{exp} peralatan</strong> riksa uji sudah EXPIRED — segera tindak lanjuti</span>
                <button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: 'var(--red-text)', cursor: 'pointer', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>Lihat →</button>
              </div>
            )}
            {warn > 0 && (
              <div className="notif notif-warning" style={{ fontSize: 13 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}><strong>{warn} peralatan</strong> riksa uji akan jatuh tempo dalam 3 bulan</span>
                <button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: 'var(--amber-text)', cursor: 'pointer', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>Lihat →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Stat Cards ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Total Peralatan', value: total, icon: Package,      color: 'var(--accent)', bg: 'var(--accent-light)', pct: null },
            { label: 'Riksa Uji Aktif',  value: aktif, icon: CheckCircle2, color: 'var(--green)', bg: 'var(--green-light)',  pct: total > 0 ? Math.round((aktif/total)*100) : 0 },
            { label: 'Segera Habis',     value: warn,  icon: Clock,        color: 'var(--amber)', bg: 'var(--amber-light)',  pct: total > 0 ? Math.round((warn/total)*100)  : 0 },
            { label: 'Expired',          value: exp,   icon: XCircle,      color: 'var(--red)',   bg: 'var(--red-light)',    pct: total > 0 ? Math.round((exp/total)*100)   : 0 },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, background: s.bg, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={17} color={s.color} />
                </div>
                {s.pct !== null && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 99 }}>{s.pct}%</span>
                )}
              </div>
              <p style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 5, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Main Grid ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Status Distribution */}
          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h2 className="text-heading">Distribusi Status Riksa Uji</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              {/* donut */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut data={donut} total={total} size={120} stroke={14} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{total}</span>
                  <span style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 2, letterSpacing: '0.06em', fontWeight: 600 }}>TOTAL</span>
                </div>
              </div>
              {/* legend */}
              <div style={{ flex: 1 }}>
                {[
                  { label: 'Aktif',        value: aktif, color: '#16A34A' },
                  { label: 'Segera Habis', value: warn,  color: '#D97706' },
                  { label: 'Expired',      value: exp,   color: '#DC2626' },
                  { label: 'Belum Diisi',  value: unkn,  color: '#9CA3AF' },
                ].map(s => (
                  <div key={s.label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{s.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', width: 30, textAlign: 'right' }}>
                          {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                        </span>
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

          {/* Per Kategori */}
          <div className="card" style={{ padding: 22 }}>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <h2 className="text-heading">Per Kategori</h2>
            </div>
            {catData.length === 0 ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>Belum ada data kategori.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {catData.map((c, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{c.cat}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.total}</span>
                    </div>
                    <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)', gap: 1 }}>
                      {c.aktif   > 0 && <div style={{ flex: c.aktif,   background: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{c.aktif}</div>}
                      {c.warning > 0 && <div style={{ flex: c.warning, background: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{c.warning}</div>}
                      {c.expired > 0 && <div style={{ flex: c.expired, background: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{c.expired}</div>}
                      {(c.total - c.aktif - c.warning - c.expired) > 0 && <div style={{ flex: c.total - c.aktif - c.warning - c.expired, background: '#E5E7EB' }} />}
                    </div>
                  </div>
                ))}
                {/* Legend */}
                <div style={{ display: 'flex', gap: 14, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  {[{ l: 'Aktif', c: '#16A34A' }, { l: 'Segera Habis', c: '#D97706' }, { l: 'Expired', c: '#DC2626' }].map(x => (
                    <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: x.c }} />
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{x.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom Grid ───────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Perlu Perhatian */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="section-header"><h2 className="text-heading">Perlu Perhatian</h2></div>
              <button onClick={() => navigate('/inventory')} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                Lihat Semua <ChevronRight size={12} />
              </button>
            </div>
            {urgent.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
                <CheckCircle2 size={28} color="var(--green)" style={{ marginBottom: 10 }} />
                <p style={{ fontSize: 13 }}>Semua riksa uji dalam kondisi baik</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. Peralatan</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Jatuh Tempo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {urgent.map(e => {
                    const s = getRiksaUjiStatus(e.nextInspectionDate);
                    return (
                      <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{e.equipmentNo}</td>
                        <td style={{ color: 'var(--ink)' }}>{e.equipmentName || '-'}</td>
                        <td>{e.department || '-'}</td>
                        <td style={{ fontWeight: 600, color: s === 'expired' ? 'var(--red)' : 'var(--amber)' }}>{formatDateShort(e.nextInspectionDate)}</td>
                        <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Aktivitas Terbaru */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
              <div className="section-header"><h2 className="text-heading">Aktivitas Terbaru</h2></div>
            </div>
            <div>
              {recent.map((e, i, arr) => (
                <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background var(--t)' }}
                  onMouseEnter={el => (el.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 30, height: 30, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={13} color="var(--ink-3)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{e.equipmentNo}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{formatDateShort(e.updatedAt)}</p>
                  </div>
                  <ChevronRight size={12} color="var(--ink-4)" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};
