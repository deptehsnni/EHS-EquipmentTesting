import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, riksaUjiStatusLabel, formatDateShort } from '../types';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const MI = ({ icon, style = {}, className = '' }: { icon: string; style?: React.CSSProperties; className?: string }) => (
  <span className={`mi ${className}`} style={style}>{icon}</span>
);

type FStatus = 'all' | 'active' | 'warning' | 'expired' | 'unknown';

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setV(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return v;
};

const doExportExcel = (data: Equipment[]) => {
  const rows = data.map(e => ({ 'No. Peralatan': e.equipmentNo, 'Nama': e.equipmentName, 'Kategori': e.category, 'Tipe': e.equipmentType, 'Merk': e.brand, 'Departemen': e.department, 'Riksa Uji Terakhir': e.lastInspectionDate || '-', 'Masa Berlaku': e.validityPeriod || '-', 'Riksa Uji Berikutnya': e.nextInspectionDate || '-', 'Status': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)] }));
  const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Array(10).fill({ wch: 20 });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, `EHS_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const doExportPDF = (data: Equipment[]) => {
  const now = new Date();
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;color:#283439;padding:28px;font-size:11px}h1{font-size:15px;font-weight:800;color:#1A365D;margin-bottom:3px}p.sub{color:#546166;margin-bottom:18px}table{width:100%;border-collapse:collapse}th{padding:6px 9px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.05em;color:#707d82;background:#eff4f7;border-bottom:1px solid #e7eff3}td{padding:7px 9px;border-bottom:1px solid #f7fafc;font-size:11px}.fn{font-family:monospace;font-weight:700}footer{margin-top:18px;font-size:9px;color:#a7b4ba;border-top:1px solid #e7eff3;padding-top:8px;display:flex;justify-content:space-between}@media print{body{padding:14px}}</style></head><body>
<h1>Inventory EHS Equipment</h1><p class="sub">Dicetak ${now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · ${data.length} peralatan</p>
<table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th></tr></thead><tbody>
${data.map(e=>{const s=getRiksaUjiStatus(e.nextInspectionDate);const c={active:'#16a34a',warning:'#5d5d78',expired:'#9f403d',unknown:'#707d82'}[s];return`<tr><td class="fn">${e.equipmentNo}</td><td>${e.equipmentName||'-'}</td><td>${e.category}</td><td>${e.department||'-'}</td><td style="color:${c};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td><td style="color:${c}">${riksaUjiStatusLabel[s]}</td></tr>`}).join('')}
</tbody></table><footer><span>EHS Equipment Testing System</span><span>${now.getFullYear()}</span></footer></body></html>`;
  const w = window.open('', '_blank'); if (!w) return; w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500);
};

const statusIcon = (s: string) => s === 'active' ? 'verified' : s === 'warning' ? 'warning' : s === 'expired' ? 'error' : 'help_outline';
const statusIconColor = (s: string) => s === 'active' ? '#455f88' : s === 'warning' ? '#5d5d78' : s === 'expired' ? '#9f403d' : '#a7b4ba';

const tabs: { key: FStatus; label: string }[] = [
  { key: 'all', label: 'Semua' }, { key: 'active', label: 'Aktif' },
  { key: 'warning', label: 'Segera Habis' }, { key: 'expired', label: 'Expired' },
  { key: 'unknown', label: 'Belum Diisi' },
];

export const InventoryPage: React.FC = () => {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const isMobile   = useIsMobile();
  const exportRef  = useRef<HTMLDivElement>(null);

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState(params.get('q') || '');
  const [fStatus,    setFStatus]    = useState<FStatus>((params.get('filter') as FStatus) || 'all');
  const [fCat,       setFCat]       = useState('all');
  const [fDept,      setFDept]      = useState('all');
  const [showFilter, setShowFilter] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    supabase.from('equipments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false); };
    document.addEventListener('mousedown', fn); return () => document.removeEventListener('mousedown', fn);
  }, []);

  const cats  = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.category)))], [equipments]);
  const depts = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.department).filter(Boolean) as string[]))], [equipments]);

  const filtered = useMemo(() => equipments.filter(e => {
    const s = getRiksaUjiStatus(e.nextInspectionDate), q = search.toLowerCase();
    return (!search || [e.equipmentNo, e.equipmentName, e.department, e.category].some(f => f?.toLowerCase().includes(q)))
      && (fStatus === 'all' || s === fStatus)
      && (fCat === 'all' || e.category === fCat)
      && (fDept === 'all' || e.department === fDept);
  }), [equipments, search, fStatus, fCat, fDept]);

  const tabCount = useMemo(() => {
    const m: Partial<Record<FStatus, number>> = {};
    equipments.forEach(e => { const s = getRiksaUjiStatus(e.nextInspectionDate) as FStatus; m[s] = (m[s] || 0) + 1; });
    return m;
  }, [equipments]);

  const activeFilters = [fStatus !== 'all', fCat !== 'all', fDept !== 'all'].filter(Boolean).length;
  const clearAll = () => { setFStatus('all'); setFCat('all'); setFDept('all'); setSearch(''); };

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: 'var(--surface-container-low)', minHeight: '100vh' }}>
        <div style={{ background: 'var(--surface-container-lowest)', padding: '14px 14px 0', position: 'sticky', top: 'var(--topbar-h)', zIndex: 40, borderBottom: '1px solid var(--surface-container)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 20, color: '#1A365D', letterSpacing: '-0.02em' }}>Inventory</h1>
              <p style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginTop: 2 }}>{filtered.length} dari {equipments.length} peralatan</p>
            </div>
            <button onClick={() => navigate('/register-equipment')} className="btn btn-primary" style={{ height: 38, gap: 5 }}>
              <MI icon="add" className="mi-sm" /> Tambah
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <MI icon="search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Cari peralatan..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, height: 42 }} />
            {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: 2 }}><MI icon="close" className="mi-sm" /></button>}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFStatus(t.key)} style={{ padding: '5px 12px', borderRadius: 99, fontFamily: 'Manrope', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', border: fStatus === t.key ? 'none' : '1.5px solid var(--surface-container)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: fStatus === t.key ? 'var(--primary)' : 'transparent', color: fStatus === t.key ? '#f6f7ff' : 'var(--on-surface-variant)', transition: 'all 0.15s' }}>
                {t.label}{t.key !== 'all' && tabCount[t.key] !== undefined ? ` ${tabCount[t.key]}` : ''}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 12px 16px' }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <MI icon="inventory_2" style={{ color: 'var(--outline-variant)', fontSize: 36, marginBottom: 12 }} />
              <p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface-variant)' }}>Tidak ada peralatan ditemukan</p>
              {(search || activeFilters > 0) && <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Reset filter</button>}
            </div>
          ) : filtered.map(e => {
            const s = getRiksaUjiStatus(e.nextInspectionDate);
            return (
              <div key={e.id} className="m-card-tap" style={{ marginBottom: 8 }} onClick={() => navigate(`/inventory/${e.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 14px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MI icon={statusIcon(s)} style={{ color: statusIconColor(s), fontSize: 22 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--on-surface)' }}>{e.equipmentNo}</span>
                      <span className={`status-pill status-${s}`}>{riksaUjiStatusLabel[s]}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.equipmentName || '-'}</p>
                    <p style={{ fontSize: 11, color: 'var(--outline)', marginTop: 2 }}>{e.category}{e.department ? ` · ${e.department}` : ''}</p>
                  </div>
                  <MI icon="chevron_right" style={{ color: 'var(--outline-variant)', flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => doExportExcel(filtered)} className="btn btn-secondary" style={{ flex: 1, height: 42 }}><FileSpreadsheet size={13} /> Excel</button>
              <button onClick={() => doExportPDF(filtered)} className="btn btn-ghost" style={{ flex: 1, height: 42 }}><FileText size={13} /> PDF</button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );

  /* ════════ PC ════════ */
  return (
    <Layout>
      <div style={{ padding: '40px 48px', maxWidth: 1600, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope', fontSize: 28, fontWeight: 800, color: '#1A365D', letterSpacing: '-0.025em' }}>Inventory</h1>
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 4 }}>{filtered.length} dari {equipments.length} peralatan terdaftar</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <div style={{ position: 'relative' }} ref={exportRef}>
              <button onClick={() => setExportOpen(o => !o)} className="btn btn-secondary" style={{ gap: 6 }}>
                <Download size={14} /> Export <MI icon="expand_more" className="mi-sm" />
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button className="export-menu-item" onClick={() => { doExportExcel(filtered); setExportOpen(false); }}><FileSpreadsheet size={14} color="#455f88" /> Export Excel (.xlsx)</button>
                  <button className="export-menu-item" onClick={() => { doExportPDF(filtered); setExportOpen(false); }}><FileText size={14} color="#9f403d" /> Cetak / Simpan PDF</button>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/register-equipment')} className="btn btn-primary" style={{ gap: 6 }}>
              <MI icon="add" className="mi-sm" /> Registrasi Unit Baru
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: showFilter ? 16 : 14 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <MI icon="search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--outline)', fontSize: 16, pointerEvents: 'none' }} />
              <input className="input-field" placeholder="Cari nomor peralatan, nama, departemen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
              {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--outline)', display: 'flex', padding: 2 }}><MI icon="close" className="mi-sm" /></button>}
            </div>
            <button onClick={() => setShowFilter(v => !v)} className="btn btn-secondary" style={{ gap: 6, position: 'relative' }}>
              <MI icon="tune" className="mi-sm" /> Filter
              {activeFilters > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--primary)', color: '#fff', borderRadius: '50%', fontSize: 9, fontFamily: 'Manrope', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilters}</span>}
            </button>
            {activeFilters > 0 && <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--error)' }}><MI icon="close" className="mi-sm" /> Reset</button>}
          </div>

          {showFilter && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, paddingTop: 14, borderTop: '1px solid var(--surface-container)' }}>
              <div>
                <p className="label-caps" style={{ marginBottom: 6 }}>Kategori</p>
                <select className="input-field" value={fCat} onChange={e => setFCat(e.target.value)}>
                  {cats.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>)}
                </select>
              </div>
              <div>
                <p className="label-caps" style={{ marginBottom: 6 }}>Departemen</p>
                <select className="input-field" value={fDept} onChange={e => setFDept(e.target.value)}>
                  {depts.map(d => <option key={d} value={d}>{d === 'all' ? 'Semua Departemen' : d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFStatus(t.key)} style={{ padding: '5px 12px', borderRadius: 6, fontFamily: 'Manrope', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'all 0.12s', background: fStatus === t.key ? 'var(--primary)' : 'transparent', color: fStatus === t.key ? '#f6f7ff' : 'var(--on-surface-variant)' }}>
                {t.label}{t.key !== 'all' && tabCount[t.key] !== undefined ? ` · ${tabCount[t.key]}` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <MI icon="inventory_2" style={{ color: 'var(--outline-variant)', fontSize: 40, marginBottom: 14 }} />
              <p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 14, color: 'var(--on-surface-variant)' }}>Tidak ada peralatan ditemukan</p>
              {(search || activeFilters > 0) && <button onClick={clearAll} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>Reset semua filter</button>}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Peralatan</th>
                  <th>Nama & Kategori</th>
                  <th>Departemen</th>
                  <th>Riksa Uji Berikutnya</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const s = getRiksaUjiStatus(e.nextInspectionDate);
                  return (
                    <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}
                      onMouseEnter={ev => { (ev.currentTarget.querySelector('.row-action') as HTMLElement)?.style && ((ev.currentTarget.querySelector('.row-action') as HTMLElement).style.opacity = '1'); }}
                      onMouseLeave={ev => { (ev.currentTarget.querySelector('.row-action') as HTMLElement)?.style && ((ev.currentTarget.querySelector('.row-action') as HTMLElement).style.opacity = '0'); }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <MI icon={statusIcon(s)} style={{ color: statusIconColor(s), fontSize: 18 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--on-surface)' }}>{e.equipmentNo}</span>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontFamily: 'Manrope', fontWeight: 600, fontSize: 13, color: 'var(--on-surface)' }}>{e.equipmentName || '-'}</p>
                        <p className="label-caps" style={{ marginTop: 2 }}>{e.category}</p>
                      </td>
                      <td>{e.department || '-'}</td>
                      <td style={{ fontFamily: 'Manrope', fontWeight: 600, color: s === 'expired' ? 'var(--error)' : s === 'warning' ? 'var(--tertiary)' : 'var(--on-surface-variant)' }}>
                        {formatDateShort(e.nextInspectionDate)}
                      </td>
                      <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                      <td>
                        <button className="row-action btn btn-primary btn-sm" style={{ opacity: 0, transition: 'opacity 0.15s' }}
                          onClick={ev => { ev.stopPropagation(); navigate(`/inventory/${e.id}`); }}>
                          LIHAT
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => navigate('/register-equipment')}>
        <MI icon="add_box" /> REGISTRASI UNIT BARU
      </button>
    </Layout>
  );
};
