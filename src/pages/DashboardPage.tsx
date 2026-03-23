import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { useAuth } from '../App';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, riksaUjiStatusLabel, formatDateShort } from '../types';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const MI = ({ icon, style = {}, className = '' }: { icon: string; style?: React.CSSProperties; className?: string }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setV(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return v;
};

/* ── Donut Chart ──────────────────────────────────────────────────────────── */
const Donut: React.FC<{ data: { value: number; color: string }[]; total: number; size: number; stroke: number; pct: number }> = ({ data, total, size, stroke, pct }) => {
  const r = (size - stroke) / 2, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  let off = 0;
  const segs = data.map(d => { const dash = total > 0 ? (d.value / total) * circ : 0; const s = { ...d, dash, off }; off += dash; return s; });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface-container)" strokeWidth={stroke} />
      {segs.map((s, i) => s.dash > 0 ? (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ - s.dash}`} strokeDashoffset={-s.off}
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      ) : null)}
    </svg>
  );
};

/* ── Exports ─────────────────────────────────────────────────────────────── */
const doExportExcel = (equipments: Equipment[]) => {
  const now = new Date(), wb = XLSX.utils.book_new(), tot = equipments.length;
  const pct = (n: number) => tot > 0 ? `${Math.round((n / tot) * 100)}%` : '0%';
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warn  = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const exp   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unkn  = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;
  const ws1 = XLSX.utils.aoa_to_sheet([['LAPORAN EHS EQUIPMENT TESTING'], ['Tanggal', now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })], [], ['Status', 'Jumlah', '%'], ['Aktif', aktif, pct(aktif)], ['Segera Habis', warn, pct(warn)], ['Expired', exp, pct(exp)], ['Belum Diisi', unkn, pct(unkn)], ['TOTAL', tot, '100%']]);
  ws1['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
  const ws2 = XLSX.utils.json_to_sheet(equipments.map(e => ({ 'No.': e.equipmentNo, 'Nama': e.equipmentName, 'Kategori': e.category, 'Dept': e.department, 'Riksa Uji': e.nextInspectionDate || '-', 'Status': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)] })));
  ws2['!cols'] = Array(6).fill({ wch: 20 });
  XLSX.utils.book_append_sheet(wb, ws2, 'Semua Peralatan');
  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));
  if (urgent.length > 0) { const ws3 = XLSX.utils.json_to_sheet(urgent.map(e => ({ 'Prioritas': getRiksaUjiStatus(e.nextInspectionDate) === 'expired' ? 'EXPIRED' : 'SEGERA HABIS', 'No.': e.equipmentNo, 'Nama': e.equipmentName, 'Dept': e.department, 'Jatuh Tempo': e.nextInspectionDate || '-' }))); XLSX.utils.book_append_sheet(wb, ws3, 'Perlu Perhatian'); }
  XLSX.writeFile(wb, `Laporan_EHS_${now.toISOString().split('T')[0]}.xlsx`);
};

const doExportPDF = (equipments: Equipment[]) => {
  const now = new Date(), tot = equipments.length;
  const aktif = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warn  = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const exp   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const urgent = equipments.filter(e => ['expired', 'warning'].includes(getRiksaUjiStatus(e.nextInspectionDate)));
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#283439;padding:32px;font-size:12px}h1{font-size:18px;font-weight:800;margin-bottom:3px;color:#1A365D}p.sub{color:#546166;margin-bottom:20px}.row4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}.box{border:1px solid #e7eff3;border-radius:8px;padding:12px 14px;background:#fff}.num{font-size:22px;font-weight:800}.lbl{font-size:10px;color:#546166;margin-top:2px}h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#546166;margin:18px 0 8px;padding-bottom:5px;border-bottom:1px solid #e7eff3}table{width:100%;border-collapse:collapse}th{padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#707d82;background:#eff4f7;border-bottom:1px solid #e7eff3}td{padding:8px 10px;border-bottom:1px solid #f7fafc;font-size:11px}.fn{font-family:monospace;font-weight:700}footer{margin-top:24px;font-size:10px;color:#a7b4ba;border-top:1px solid #e7eff3;padding-top:10px;display:flex;justify-content:space-between}@media print{body{padding:16px}}</style></head><body>
<h1>Laporan EHS Equipment Testing</h1><p class="sub">Dicetak ${now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · ${now.toLocaleTimeString('id-ID')}</p>
<div class="row4"><div class="box"><div class="num" style="color:#455f88">${tot}</div><div class="lbl">Total Peralatan</div></div><div class="box"><div class="num" style="color:#16a34a">${aktif}</div><div class="lbl">Aktif</div></div><div class="box"><div class="num" style="color:#5d5d78">${warn}</div><div class="lbl">Segera Habis</div></div><div class="box"><div class="num" style="color:#9f403d">${exp}</div><div class="lbl">Expired</div></div></div>
${urgent.length > 0 ? `<h2>Perlu Perhatian (${urgent.length})</h2><table><thead><tr><th>No.</th><th>Nama</th><th>Dept</th><th>Jatuh Tempo</th><th>Status</th></tr></thead><tbody>${urgent.map(e=>{const s=getRiksaUjiStatus(e.nextInspectionDate);return`<tr><td class="fn">${e.equipmentNo}</td><td>${e.equipmentName||'-'}</td><td>${e.department||'-'}</td><td style="color:${s==='expired'?'#9f403d':'#5d5d78'};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td><td style="color:${s==='expired'?'#9f403d':'#5d5d78'};font-weight:700">${riksaUjiStatusLabel[s]}</td></tr>`}).join('')}</tbody></table>` : `<p style="color:#16a34a;font-weight:600;margin:12px 0">✓ Tidak ada peralatan yang perlu perhatian segera.</p>`}
<footer><span>EHS Equipment Testing System</span><span>${now.getFullYear()}</span></footer></body></html>`;
  const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
export const DashboardPage: React.FC = () => {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const isMobile    = useIsMobile();
  const exportRef   = useRef<HTMLDivElement>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    supabase.from('equipments').select('*').order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const total  = equipments.length;
  const aktif  = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'active').length;
  const warn   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'warning').length;
  const exp    = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'expired').length;
  const unkn   = equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === 'unknown').length;

  const urgent = useMemo(() =>
    equipments.filter(e => ['warning', 'expired'].includes(getRiksaUjiStatus(e.nextInspectionDate)))
      .sort((a, b) => (a.nextInspectionDate || '').localeCompare(b.nextInspectionDate || '')),
    [equipments]);

  const recent = equipments.slice(0, 5);

  const catData = useMemo(() =>
    Array.from(new Set(equipments.map(e => e.category))).map(cat => {
      const items = equipments.filter(e => e.category === cat);
      return { cat, total: items.length, pct: total > 0 ? Math.round((items.length / total) * 100) : 0 };
    }).sort((a, b) => b.total - a.total),
    [equipments, total]);

  const validPct = total > 0 ? Math.round((aktif / total) * 100) : 0;
  const today    = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Total Unit',         sub: 'Peralatan Terdaftar', value: total,  icon: 'construction', iconColor: '#455f88', iconBg: '#d6e3ff', valueCls: '#1A365D' },
    { label: 'Status Aktif',       sub: 'Sertifikasi Valid',   value: aktif,  icon: 'verified',     iconColor: '#546073', iconBg: '#d8e3fa', valueCls: '#455f88' },
    { label: 'Mendekati Expired',  sub: 'H-90 Masa Berlaku',   value: warn,   icon: 'warning',      iconColor: '#5d5d78', iconBg: '#d9d7f8', valueCls: '#5d5d78' },
    { label: 'Kritis',             sub: 'Segera Uji Ulang',    value: exp,    icon: 'error',        iconColor: '#752121', iconBg: '#fe8983', valueCls: '#9f403d', ring: true },
  ];

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: 'var(--surface-container-low)', minHeight: '100vh' }}>
        {/* Hero */}
        <div className="m-hero">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Manrope', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{today}</p>
            <h1 style={{ color: '#fff', fontFamily: 'Manrope', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>Halo, {user?.fullName?.split(' ')[0]} 👋</h1>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>Ringkasan sistem EHS hari ini</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {[{ l: 'Total', v: total, c: 'rgba(255,255,255,0.9)' }, { l: 'Aktif', v: aktif, c: '#86EFAC' }, { l: 'Segera Habis', v: warn, c: '#C4B5FD' }, { l: 'Expired', v: exp, c: '#FCA5A5' }].map(s => (
              <div key={s.l} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ color: s.c, fontSize: 26, fontFamily: 'Manrope', fontWeight: 800, lineHeight: 1 }}>{loading ? '—' : s.v}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Alerts */}
          {exp > 0 && <div className="notif notif-danger" style={{ fontSize: 13 }}><MI icon="error" className="mi-sm" style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}><strong>{exp} peralatan</strong> riksa uji sudah kritis / expired</span><button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: 'var(--error)', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Lihat</button></div>}
          {warn > 0 && <div className="notif notif-warning" style={{ fontSize: 13 }}><MI icon="warning" className="mi-sm" style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}><strong>{warn} peralatan</strong> mendekati jatuh tempo</span><button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: 'var(--tertiary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>Lihat</button></div>}

          {/* Donut + legend */}
          <div className="m-card" style={{ padding: 18 }}>
            <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D', marginBottom: 14 }}>Distribusi Status Riksa Uji</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Donut data={[{ value: aktif, color: '#455f88' }, { value: warn, color: '#5d5d78' }, { value: exp, color: '#9f403d' }, { value: unkn, color: '#a7b4ba' }]} total={total} size={96} stroke={12} pct={validPct} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Manrope', fontSize: 18, fontWeight: 800, color: '#1A365D', lineHeight: 1 }}>{validPct}%</span>
                  <span style={{ fontSize: 8, color: 'var(--on-surface-variant)', marginTop: 2, fontFamily: 'Manrope', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>VALIDITAS</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {[{ l: 'Sertifikat Aktif', v: aktif, c: '#455f88' }, { l: 'Segera Habis', v: warn, c: '#5d5d78' }, { l: 'Expired', v: exp, c: '#9f403d' }, { l: 'Belum Diisi', v: unkn, c: '#a7b4ba' }].map(s => (
                  <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{s.l}</span>
                    </div>
                    <span style={{ fontFamily: 'Manrope', fontSize: 13, fontWeight: 700, color: '#283439' }}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per Kategori */}
          {catData.length > 0 && (
            <div className="m-card" style={{ padding: 18 }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D', marginBottom: 14 }}>Peralatan Per Kategori</p>
              {catData.map((c, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, fontFamily: 'Manrope', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.cat}</span>
                    <span style={{ fontSize: 11, fontFamily: 'Manrope', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{c.total} Unit</span>
                  </div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${c.pct}%` }} /></div>
                </div>
              ))}
            </div>
          )}

          {/* Urgent */}
          {urgent.length > 0 && (
            <div className="m-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--surface-container-low)' }}>
                <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D' }}>Perlu Perhatian</p>
                <span className="badge badge-expired">Kritis</span>
              </div>
              {urgent.slice(0, 5).map((e, i, arr) => {
                const s = getRiksaUjiStatus(e.nextInspectionDate);
                return (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-low)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MI icon={s === 'expired' ? 'error' : 'warning'} style={{ color: s === 'expired' ? 'var(--error)' : 'var(--tertiary)', fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.equipmentNo} — {e.equipmentName}</p>
                      <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>{s === 'expired' ? 'Riksa uji sudah expired' : `Jatuh tempo: ${formatDateShort(e.nextInspectionDate)}`}</p>
                    </div>
                    <MI icon="chevron_right" style={{ color: 'var(--outline-variant)', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Aktivitas */}
          <div className="m-card">
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--surface-container-low)' }}>
              <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 14, color: '#1A365D' }}>Aktivitas Terbaru</p>
            </div>
            {recent.map((e, i, arr) => (
              <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--surface-container-low)' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MI icon="inventory_2" style={{ color: 'var(--outline)', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.equipmentNo}</p>
                  <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 1 }}>{formatDateShort(e.updatedAt)}</p>
                </div>
                <MI icon="chevron_right" style={{ color: 'var(--outline-variant)', flexShrink: 0 }} />
              </div>
            ))}
          </div>

          {/* Export */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => doExportExcel(equipments)} className="btn btn-secondary" style={{ flex: 1, height: 44 }}><FileSpreadsheet size={14} /> Excel</button>
            <button onClick={() => doExportPDF(equipments)} className="btn btn-ghost" style={{ flex: 1, height: 44 }}><FileText size={14} /> PDF</button>
          </div>
        </div>
      </div>
    </Layout>
  );

  /* ════════ PC ════════ */
  return (
    <Layout>
      <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }}>

        {/* Alerts */}
        {(exp > 0 || warn > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {exp > 0 && <div className="notif notif-danger" style={{ fontSize: 13 }}><MI icon="error" className="mi-sm" style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}><strong>{exp} peralatan</strong> riksa uji sudah EXPIRED — segera tindak lanjuti</span><button onClick={() => navigate('/inventory?filter=expired')} style={{ background: 'none', border: 'none', color: 'var(--error)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Manrope', flexShrink: 0 }}>LIHAT DETAIL →</button></div>}
            {warn > 0 && <div className="notif notif-warning" style={{ fontSize: 13 }}><MI icon="warning" className="mi-sm" style={{ flexShrink: 0 }} /><span style={{ flex: 1 }}><strong>{warn} peralatan</strong> mendekati jatuh tempo masa berlaku</span><button onClick={() => navigate('/inventory?filter=warning')} style={{ background: 'none', border: 'none', color: 'var(--tertiary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Manrope', flexShrink: 0 }}>LIHAT DETAIL →</button></div>}
          </div>
        )}

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 32 }}>
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={s.ring ? { boxShadow: '0 0 0 1px rgba(159,64,61,0.1), 0 2px 8px rgba(40,52,57,0.05)', background: 'linear-gradient(135deg,#fff 60%,rgba(254,137,131,0.05))' } : {}}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="icon-pill" style={{ background: s.iconBg }}>
                  <MI icon={s.icon} style={{ color: s.iconColor }} className={s.ring ? 'mi-fill' : ''} />
                </div>
                <span className="label-caps">{s.label}</span>
              </div>
              <div>
                <h3 style={{ fontFamily: 'Manrope', fontSize: 38, fontWeight: 800, color: s.valueCls, letterSpacing: '-0.03em', lineHeight: 1 }}>{loading ? '—' : s.value.toLocaleString()}</h3>
                <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 4 }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bento Grid ───────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 20 }}>

          {/* Donut Chart — 4 cols */}
          <div className="card-low" style={{ gridColumn: 'span 4', padding: 28 }}>
            <h4 className="h-section" style={{ marginBottom: 24 }}>Distribusi Status Riksa Uji</h4>
            {/* Donut */}
            <div style={{ position: 'relative', width: 168, height: 168, margin: '0 auto 24px' }}>
              <Donut data={[{ value: aktif, color: '#455f88' }, { value: warn, color: '#5d5d78' }, { value: exp, color: '#9f403d' }, { value: unkn, color: '#a7b4ba' }]} total={total} size={168} stroke={20} pct={validPct} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'Manrope', fontSize: 28, fontWeight: 800, color: '#1A365D', lineHeight: 1 }}>{validPct}%</span>
                <span className="label-caps" style={{ marginTop: 4 }}>Validitas</span>
              </div>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[{ l: 'Sertifikat Aktif', v: aktif, c: '#455f88' }, { l: 'Proses Perpanjangan', v: warn, c: '#5d5d78' }, { l: 'Expired', v: exp, c: '#9f403d' }].map(s => (
                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.c }} />
                    <span style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>{s.l}</span>
                  </div>
                  <span style={{ fontFamily: 'Manrope', fontSize: 13, fontWeight: 700, color: 'var(--on-surface)' }}>{s.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per Kategori — 8 cols */}
          <div className="card" style={{ gridColumn: 'span 8', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <h4 className="h-section">Peralatan Per Kategori</h4>
              <button onClick={() => navigate('/inventory')} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'Manrope', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                LIHAT DETAIL <MI icon="chevron_right" className="mi-sm" />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {catData.map((c, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span className="label-caps">{c.cat}</span>
                    <span className="label-caps">{c.total} Unit</span>
                  </div>
                  <div className="progress-track" style={{ height: 8 }}>
                    <div className="progress-fill" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
              {catData.length === 0 && <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>Belum ada data kategori.</p>}
            </div>
          </div>

          {/* Perlu Perhatian — 7 cols */}
          <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="h-section">Perlu Perhatian</h4>
              {urgent.length > 0 && <span className="badge badge-expired" style={{ fontSize: 9, letterSpacing: '0.08em' }}>KRITIS</span>}
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : urgent.length === 0 ? (
              <div className="card" style={{ padding: 28, textAlign: 'center' }}>
                <MI icon="verified" style={{ color: '#16a34a', fontSize: 32, marginBottom: 10 }} />
                <p style={{ fontFamily: 'Manrope', fontWeight: 600, color: '#14532d', fontSize: 13 }}>Semua riksa uji dalam kondisi baik</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {urgent.map(e => {
                  const s = getRiksaUjiStatus(e.nextInspectionDate);
                  return (
                    <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}
                      className="card"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--surface-container-high)'; (ev.currentTarget.querySelector('.urgent-btn') as HTMLElement)!.style.opacity = '1'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.background = 'var(--surface-container-lowest)'; (ev.currentTarget.querySelector('.urgent-btn') as HTMLElement)!.style.opacity = '0'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <MI icon={s === 'expired' ? 'error' : 'schedule'} style={{ color: s === 'expired' ? 'var(--error)' : 'var(--tertiary)', fontSize: 22 }} />
                        </div>
                        <div>
                          <p style={{ fontFamily: 'Manrope', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{e.equipmentNo} — {e.equipmentName || '-'}</p>
                          <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                            {s === 'expired' ? 'Riksa uji sudah expired' : `Jatuh tempo: ${formatDateShort(e.nextInspectionDate)}`}
                          </p>
                        </div>
                      </div>
                      <button className="urgent-btn btn btn-primary btn-sm" style={{ opacity: 0, transition: 'opacity 0.15s', pointerEvents: 'none' }}
                        onClick={ev => { ev.stopPropagation(); navigate(`/inventory/${e.id}`); }}>
                        LIHAT
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Aktivitas Terbaru — 5 cols (timeline style) */}
          <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 className="h-section">Aktivitas Terbaru</h4>
              {/* Export button */}
              <div style={{ position: 'relative' }} ref={exportRef}>
                <button onClick={() => setExportOpen(o => !o)} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
                  <Download size={13} /> Export
                  <MI icon="expand_more" className="mi-sm" />
                </button>
                {exportOpen && (
                  <div className="export-menu">
                    <button className="export-menu-item" onClick={() => { doExportExcel(equipments); setExportOpen(false); }}>
                      <FileSpreadsheet size={14} color="#455f88" /> Export Excel (.xlsx)
                    </button>
                    <button className="export-menu-item" onClick={() => { doExportPDF(equipments); setExportOpen(false); }}>
                      <FileText size={14} color="#9f403d" /> Cetak / Simpan PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card-low" style={{ padding: 24, position: 'relative', overflow: 'hidden', flex: 1 }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: 32, top: 36, bottom: 36, width: 1, background: 'var(--outline-variant)', opacity: 0.3 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                {loading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                ) : recent.length === 0 ? (
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: 13 }}>Belum ada aktivitas.</p>
                ) : recent.map((e, i) => (
                  <div key={e.id} onClick={() => navigate(`/inventory/${e.id}`)} style={{ display: 'flex', gap: 20, cursor: 'pointer', opacity: i >= 3 ? 0.55 : 1 }}>
                    {/* Timeline dot */}
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? 'var(--primary)' : i === 1 ? 'var(--secondary)' : 'var(--outline-variant)', flexShrink: 0, marginTop: 4, zIndex: 1, boxShadow: `0 0 0 3px var(--surface-container-low)` }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="label-caps" style={{ marginBottom: 4 }}>{formatDateShort(e.updatedAt)}</p>
                      <p style={{ fontSize: 13, color: 'var(--on-surface)' }}>Pembaruan peralatan <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{e.equipmentNo}</span></p>
                      <p className="label-caps" style={{ marginTop: 3 }}>Oleh: {e.updatedBy || 'Sistem'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/register-equipment')}>
        <MI icon="add_box" />
        REGISTRASI UNIT BARU
      </button>
    </Layout>
  );
};
