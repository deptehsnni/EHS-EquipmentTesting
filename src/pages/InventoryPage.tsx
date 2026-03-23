import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, getRiksaUjiColor, riksaUjiStatusLabel, formatDateShort } from '../types';
import { Search, Filter, Plus, Download, ChevronRight, Package, X } from 'lucide-react';
import * as XLSX from 'xlsx';

type FilterStatus = 'all' | 'active' | 'warning' | 'expired' | 'unknown';

const useIsMobile = () => {
  const [isMob, setIsMob] = useState(window.innerWidth < 1024);
  useEffect(() => { const fn = () => setIsMob(window.innerWidth < 1024); window.addEventListener('resize', fn); return () => window.removeEventListener('resize', fn); }, []);
  return isMob;
};

export const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>((searchParams.get('filter') as FilterStatus) || 'all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase.from('equipments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setEquipments(data.map(mapDbToEquipment)); setLoading(false); });
  }, []);

  const categories = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.category)))], [equipments]);
  const departments = useMemo(() => ['all', ...Array.from(new Set(equipments.map(e => e.department).filter((d): d is string => Boolean(d))))], [equipments]);

  const filtered = useMemo(() => equipments.filter(e => {
    const s = getRiksaUjiStatus(e.nextInspectionDate);
    return (!search || [e.equipmentNo, e.equipmentName, e.department, e.category].some(field => field?.toLowerCase().includes(search.toLowerCase())))
      && (filterStatus === 'all' || s === filterStatus)
      && (filterCategory === 'all' || e.category === filterCategory)
      && (filterDept === 'all' || e.department === filterDept);
  }), [equipments, search, filterStatus, filterCategory, filterDept]);

  const exportExcel = () => {
    const rows = filtered.map(e => ({
      'No. Peralatan': e.equipmentNo, 'Nama': e.equipmentName, 'Kategori': e.category,
      'Tipe': e.equipmentType, 'Merk': e.brand, 'Tahun': e.manufactureYear,
      'Departemen': e.department, 'Status Kondisi': e.status,
      'Riksa Uji Terakhir': e.lastInspectionDate || '-', 'Masa Berlaku': e.validityPeriod || '-',
      'Riksa Uji Berikutnya': e.nextInspectionDate || '-',
      'Status Riksa Uji': riksaUjiStatusLabel[getRiksaUjiStatus(e.nextInspectionDate)],
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, `EHS_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'Semua' }, { key: 'active', label: 'Aktif' },
    { key: 'warning', label: 'Segera Habis' }, { key: 'expired', label: 'Expired' },
    { key: 'unknown', label: 'Belum Diisi' },
  ];

  const activeFilters = [filterStatus !== 'all', filterCategory !== 'all', filterDept !== 'all'].filter(Boolean).length;

  // ── MOBILE ───────────────────────────────────────────────────────────────────
  if (isMobile) return (
    <Layout>
      <div style={{ background: '#F2F2F7', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontWeight: 800, fontSize: 22, color: '#111', letterSpacing: '-0.02em' }}>Inventory</h1>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{filtered.length} dari {equipments.length} peralatan</p>
            </div>
            <button onClick={() => navigate('/register-equipment')} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>+ Tambah</button>
          </div>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={16} color="#9CA3AF" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input className="input-field" placeholder="Cari peralatan..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40, height: 44, borderRadius: 12, fontSize: 15 }} />
          </div>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFilterStatus(t.key)} style={{
                padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: filterStatus === t.key ? 'var(--accent)' : '#F3F4F6',
                color: filterStatus === t.key ? '#fff' : '#6B7280',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <Package size={32} color="#D1D5DB" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#9CA3AF', fontWeight: 500 }}>Tidak ada peralatan ditemukan</p>
            </div>
          ) : filtered.map(e => {
            const s = getRiksaUjiStatus(e.nextInspectionDate);
            const pillClass = s === 'active' ? 'status-active' : s === 'warning' ? 'status-warning' : s === 'expired' ? 'status-expired' : 'status-unknown';
            const dotColor = s === 'active' ? '#16A34A' : s === 'warning' ? '#D97706' : s === 'expired' ? '#DC2626' : '#9CA3AF';
            return (
              <div key={e.id} className="m-card-pressable" onClick={() => navigate(`/inventory/${e.id}`)}>
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 4, height: 44, background: dotColor, borderRadius: 99, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: '#111' }}>{e.equipmentNo}</span>
                      <span className={`status-pill ${pillClass}`}>{riksaUjiStatusLabel[s]}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#374151', marginBottom: 3, fontWeight: 500 }}>{e.equipmentName || '-'}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>{e.category} · {e.department || '-'}</p>
                  </div>
                  <ChevronRight size={16} color="#D1D5DB" style={{ flexShrink: 0 }} />
                </div>
              </div>
            );
          })}
          <button onClick={exportExcel} className="btn btn-secondary" style={{ width: '100%', marginTop: 8, height: 48, borderRadius: 14, gap: 8, fontSize: 14 }}>
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>
    </Layout>
  );

  // ── PC ────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div style={{ padding: '32px 40px', maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 className="text-display">Inventory</h1>
            <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 6 }}>{filtered.length} dari {equipments.length} peralatan terdaftar</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportExcel} className="btn btn-secondary" style={{ gap: 6 }}>
              <Download size={14} /> Export Excel
            </button>
            <button onClick={() => navigate('/register-equipment')} className="btn btn-primary">+ Registrasi</button>
          </div>
        </div>

        {/* Filters */}
        <div className="surface" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} color="var(--ink-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input className="input-field" placeholder="Cari nomor, nama, departemen..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary" style={{ gap: 6, position: 'relative' }}>
              <Filter size={14} /> Filter
              {activeFilters > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: 'var(--accent)', borderRadius: '50%', fontSize: 10, color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeFilters}</span>}
            </button>
          </div>
          {showFilters && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)', marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategori</label>
                <select className="input-field" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'Semua Kategori' : c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Departemen</label>
                <select className="input-field" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  {departments.map(d => <option key={d} value={d}>{d === 'all' ? 'Semua Departemen' : d}</option>)}
                </select>
              </div>
            </div>
          )}
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setFilterStatus(t.key)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: filterStatus === t.key ? 'var(--ink)' : 'transparent',
                color: filterStatus === t.key ? '#fff' : 'var(--ink-3)',
                transition: 'all 0.12s',
              }}>{t.label} {t.key !== 'all' && <span style={{ opacity: 0.6, marginLeft: 3 }}>{equipments.filter(e => getRiksaUjiStatus(e.nextInspectionDate) === t.key).length}</span>}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="surface" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Package size={36} color="var(--border-2)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--ink-3)', fontSize: 14 }}>Tidak ada peralatan ditemukan</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>No. Peralatan</th><th>Nama & Kategori</th><th>Departemen</th><th>Riksa Uji Berikutnya</th><th>Status</th><th style={{ width: 40 }}></th></tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const s = getRiksaUjiStatus(e.nextInspectionDate);
                  const c = getRiksaUjiColor(s);
                  return (
                    <tr key={e.id} onClick={() => navigate(`/inventory/${e.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 3, height: 18, background: s === 'active' ? 'var(--green)' : s === 'warning' ? 'var(--amber)' : s === 'expired' ? 'var(--red)' : 'var(--border-2)', borderRadius: 99 }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{e.equipmentNo}</span>
                        </div>
                      </td>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13 }}>{e.equipmentName || '-'}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{e.category}</p>
                      </td>
                      <td style={{ color: 'var(--ink-3)' }}>{e.department || '-'}</td>
                      <td style={{ fontWeight: 500, color: s === 'expired' ? 'var(--red)' : s === 'warning' ? 'var(--amber)' : 'var(--ink)' }}>
                        {formatDateShort(e.nextInspectionDate)}
                      </td>
                      <td><span className={`badge badge-${s}`}>{riksaUjiStatusLabel[s]}</span></td>
                      <td><ChevronRight size={14} color="var(--border-2)" /></td>
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
