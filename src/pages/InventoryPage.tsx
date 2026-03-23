import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, riksaUjiStatusLabel, formatDateShort } from '../types';
import { Search, Filter, Plus, Download, ChevronRight, Package, FileSpreadsheet, FileText, X, SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';

type FStatus = 'all' | 'active' | 'warning' | 'expired' | 'unknown';

const useIsMobile = () => {
  const [v, setV] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setV(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return v;
};

const doExportExcel = (data: Equipment[]) => {
  const rows = data.map(e => ({
    'No. Peralatan': e.equipmentNo, 'Nama': e.equipmentName, 'Kategori': e.category,
    'Tipe': e.equipmentType, 'Merk': e.brand, 'Departemen': e.department,
    'Riksa Uji Terakhir': e.lastInspectionDate || '-',
    'Masa Berlaku': e.validityPeriod || '-',
    'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
    'Status': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = Array(10).fill({ wch: 20 });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  XLSX.writeFile(wb, `EHS_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const doExportPDF = (data: Equipment[]) => {
  const now = new Date();
  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#111;padding:28px;font-size:11px}
  h1{font-size:16px;font-weight:700;margin-bottom:3px}p.sub{color:#666;margin-bottom:18px}
  table{width:100%;border-collapse:collapse}
  th{padding:6px 9px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;background:#f9fafb;border-bottom:1px solid #e5e7eb}
  td{padding:7px 9px;border-bottom:1px solid #f3f4f6}
  .fn{font-family:monospace;font-weight:700}
  footer{margin-top:20px;font-size:9px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px;display:flex;justify-content:space-between}
  @media print{body{padding:14px}}
  </style></head><body>
  <h1>Inventory EHS Equipment</h1>
  <p class="sub">Dicetak ${now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · ${data.length} peralatan</p>
  <table><thead><tr><th>No. Peralatan</th><th>Nama</th><th>Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th></tr></thead><tbody>
  ${data.map(e=>{const s=getRiksaUjiStatus(e.nextInspectionDate);const c={active:'#15803d',warning:'#b45309',expired:'#b91c1c',unknown:'#6b7280'}[s];return`<tr><td class="fn">${e.equipmentNo}</td><td>${e.equipmentName||'-'}</td><td>${e.category}</td><td>${e.department||'-'}</td><td style="color:${c};font-weight:600">${e.nextInspectionDate?new Date(e.nextInspectionDate).toLocaleDateString('id-ID'):'-'}</td><td style="color:${c}">${riksaUjiStatusLabel[s]}</td></tr>`}).join('')}
  </tbody></table>
  <footer><span>EHS Equipment Testing System</span><span>${now.getFullYear()}</span></footer>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

const tabs: { key: FStatus; label: string }[] = [
  { key: 'all',     label: 'Semua'       },
  { key: 'active',  label: 'Aktif'       },
  { key: 'warning', label: 'Segera Habis'},
  { key: 'expired', label: 'Expired'     },
  { key: 'unknown', label: 'Belum Diisi' },
];

export const InventoryPage: React.FC = () => {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const isMobile      = useIsMobile();
  const exportRef     = useRef<HTMLDivElement>(null);

  const [equipments, setEquipments]   = useState<Equipment[]>([]);
  const [loading,    setLoading]      = useState(true);
  const [search,     setSearch]       = useState('');
  const [fStatus,    setFStatus]      = useState<FStatus>((params.get('filter') as FStatus) || 'all');
  const [fCat,       setFCat]         = useState('all');
  const [fDept,      setFDept]        = useState('all');
  const [showFilter, setShowFilter]   = useState(false);
  const [exportOpen, setExportOpen]   = useState(false);

  useEffect(() => {
    supabase.from('equipments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.category)))], [equipments]);
  const departments = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.department).filter(Boolean) as string[]))], [equipments]);

  const filtered = useMemo(() => equipments.filter(e => {
    const s = getRiksaUjiStatus(e.nextInspectionDate);
    const q = search.toLowerCase();
    return (
      (!search || [e.equipmentNo, e.equipmentName, e.department, e.category].some(f => f?.toLowerCase().includes(q)))
      && (fStatus === 'all' || s === fStatus)
      && (fCat   === 'all' || e.category   === fCat)
      && (fDept  === 'all' || e.department === fDept)
    );
  }), [equipments, search, fStatus, fCat, fDept]);

  const tabCount = useMemo(() => {
    const m: Partial<Record<FStatus, number>> = {};
    equipments.forEach(e => {
      const s = getRiksaUjiStatus(e.nextInspectionDate) as FStatus;
      m[s] = (m[s] || 0) + 1;
    });
    return m;
  }, [equipments]);

  const activeFilters = [fStatus !== 'all', fCat !== 'all', fDept !== 'all'].filter(Boolean).length;
  const clearFilters  = () => { setFStatus('all'); setFCat('all'); setFDept('all'); setSearch(''); };

  const dotColor = (s: string) =>
    s === 'active' ? '#16A34A' : s === 'warning' ? '#D97706' : s === 'expired' ? '#DC2626' : '#9CA3AF';

  /* ════════ MOBILE ════════ */
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F0F0EE', minHeight: '100vh' }}>

        {/* sticky mobile header */}
        <div style={{ background: 'var(--surface)', padding: '14px 14px 0', position: 'sticky', top: 54, zIndex: 40, borderBottom: '1px solid var(--border)' }}>
          {/* title + add */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
            <div>
              <h1 style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Inventory</h1>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{filtered.length} dari {equipments.length} peralatan</p>
            </div>
            <button onClick={() => navigate('/register-equipment')} className="btn btn-accent" style={{ height: 38, borderRadius: 10 }}>
              <Plus size={15} /> Tambah
            </button>
          </div>

          {/* search bar */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} color="var(--ink-3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input className="input-field" placeholder="Cari peralatan..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 38 }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* status tabs - scrollable */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, scrollbarWidth: 'none' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFStatus(t.key)} style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                border: fStatus === t.key ? 'none' : '1px solid var(--border)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                background: fStatus === t.key ? 'var(--accent)' : 'var(--surface)',
                color: fStatus === t.key ? '#fff' : 'var(--ink-2)',
                transition: 'all 0.15s',
              }}>
                {t.label}
                {t.key !== 'all' && tabCount[t.key] !== undefined && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>{tabCount[t.key]}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        <div style={{ padding: '12px 12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <Package size={28} color="var(--ink-4)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 14 }}>Tidak ada peralatan ditemukan</p>
              {(search || activeFilters > 0) && (
                <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Reset filter</button>
              )}
            </div>
          ) : filtered.map(e => {
            const s = getRiksaUjiStatus(e.nextInspectionDate);
            return (
              <div key={e.id} className="m-card-tap" style={{ marginBottom: 8 }} onClick={() => navigate(`/inventory/${e.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 13px' }}>
                  <div style={{ width: 4, alignSelf: 'stretch', background: dotColor(s), borderRadius: 99, flexShrink: 0, minHeight: 44 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{e.equipmentNo}</span>
                      <span className={`status-pill status-${s}`}>{riksaUjiStatusLabel[s]}</span>
                    </div>
                    <p className="truncate" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 2, fontWeight: 500 }}>{e.equipmentName || '-'}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.category}{e.department ? ` · ${e.department}` : ''}</p>
                  </div>
                  <ChevronRight size={14} color="var(--ink-4)" style={{ flexShrink: 0 }} />
                </div>
              </div>
            );
          })}

          {/* export buttons at bottom */}
          {filtered.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => doExportExcel(filtered)} className="btn btn-success" style={{ flex: 1, height: 42, borderRadius: 11, gap: 6 }}>
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button onClick={() => doExportPDF(filtered)} className="btn btn-secondary" style={{ flex: 1, height: 42, borderRadius: 11, gap: 6 }}>
                <FileText size={14} /> PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );

  /* ════════ PC ════════ */
  return (
    <Layout>
      <div style={{ padding: '28px 32px 40px', maxWidth: 1300, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 16 }}>
          <div>
            <h1 className="text-display">Inventory</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>
              {filtered.length} dari {equipments.length} peralatan terdaftar
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {/* Export dropdown */}
            <div style={{ position: 'relative' }} ref={exportRef}>
              <button onClick={() => setExportOpen(o => !o)} className="btn btn-secondary" style={{ gap: 6 }}>
                <Download size={14} /> Export <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
              </button>
              {exportOpen && (
                <div className="export-menu">
                  <button className="export-menu-item" onClick={() => { doExportExcel(filtered); setExportOpen(false); }}>
                    <FileSpreadsheet size={14} color="#16A34A" /> Export Excel
                  </button>
                  <button className="export-menu-item" onClick={() => { doExportPDF(filtered); setExportOpen(false); }}>
                    <FileText size={14} color="#DC2626" /> Cetak / Simpan PDF
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => navigate('/register-equipment')} className="btn btn-primary" style={{ gap: 5 }}>
              <Plus size={14} /> Registrasi
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card" style={{ padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            {/* search */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="input-field" placeholder="Cari nomor, nama, departemen..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32 }} />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', display: 'flex', padding: 2 }}>
                  <X size={13} />
                </button>
              )}
            </div>

            {/* filter toggle */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowFilter(f => !f)} className="btn btn-secondary" style={{ gap: 6 }}>
                <SlidersHorizontal size={14} /> Filter
                {activeFilters > 0 && (
                  <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '1px 5px', marginLeft: 2 }}>
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>

            {activeFilters > 0 && (
              <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--red)' }}>
                <X size={12} /> Reset
              </button>
            )}
          </div>

          {/* expanded filters */}
          {showFilter && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div>
                <p className="text-label" style={{ marginBottom: 6 }}>Kategori</p>
                <select className="input-field" value={fCat} onChange={e => setFCat(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-label" style={{ marginBottom: 6 }}>Departemen</p>
                <select className="input-field" value={fDept} onChange={e => setFDept(e.target.value)}>
                  {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'Semua Departemen' : d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* status tabs */}
          <div style={{ display: 'flex', gap: 2, borderTop: showFilter ? '1px solid var(--border)' : 'none', paddingTop: showFilter ? 12 : 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFStatus(t.key)} style={{
                padding: '5px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                background: fStatus === t.key ? 'var(--ink)' : 'transparent',
                color: fStatus === t.key ? '#fff' : 'var(--ink-3)',
              }}>
                {t.label}
                {t.key !== 'all' && tabCount[t.key] !== undefined && (
                  <span style={{ marginLeft: 4, opacity: 0.6 }}>{tabCount[t.key]}</span>
                )}
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
              <Package size={32} color="var(--ink-4)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Tidak ada peralatan ditemukan</p>
              {(search || activeFilters > 0) && (
                <button onClick={clearFilters} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Reset filter</button>
              )}
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
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const s = getRiksaUjiStatus(e.nextInspectionDate);
                  return (
                    <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 3, height: 16, borderRadius: 99, background: dotColor(s), flexShrink: 0 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{e.equipmentNo}</span>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13 }}>{e.equipmentName || '-'}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{e.category}</p>
                      </td>
                      <td>{e.department || '-'}</td>
                      <td style={{ fontWeight: 500, color: s === 'expired' ? 'var(--red)' : s === 'warning' ? 'var(--amber)' : 'var(--ink-2)' }}>
                        {formatDateShort(e.nextInspectionDate)}
                      </td>
                      <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                      <td><ChevronRight size={13} color="var(--ink-4)" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};
