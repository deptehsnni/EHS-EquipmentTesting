import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, formatDate } from '../types';
import { LogIn, AlertCircle, Loader2, CheckCircle2, AlertTriangle, XCircle, Calendar, Tag, Building2, Wrench, ChevronRight } from 'lucide-react';

export const EquipmentPublicPage: React.FC = () => {
  const { equipmentNo } = useParams<{ equipmentNo: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!equipmentNo) return;
      const { data, error } = await supabase
        .from('equipments').select('*').eq('equipment_no', equipmentNo).single();
      if (error || !data) { setError(true); } else { setEquipment(mapDbToEquipment(data)); }
      setLoading(false);
    };
    fetch();
  }, [equipmentNo]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F0F4F8' }}>
      <Loader2 className="animate-spin text-gray-400" size={36} />
    </div>
  );

  if (error || !equipment) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: '#F0F4F8' }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16
      }}>
        <XCircle size={36} color="#DC2626" />
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
        Peralatan Tidak Ditemukan
      </h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
        Nomor "{equipmentNo}" tidak terdaftar dalam sistem.
      </p>
      <button onClick={() => navigate('/public-scan')} style={{
        background: '#1E3A5F', color: '#fff', border: 'none',
        padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer'
      }}>
        Scan Ulang
      </button>
    </div>
  );

  const riksaStatus = getRiksaUjiStatus(equipment.nextInspectionDate);

  const statusConfig = {
    active: {
      icon: CheckCircle2,
      iconColor: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#6EE7B7',
      headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      badgeBg: '#D1FAE5',
      badgeText: '#065F46',
      badgeLabel: 'Riksa Uji Berlaku',
      badgeIcon: CheckCircle2,
      textColor: '#065F46',
      taglineBg: 'rgba(255,255,255,0.15)',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#FCD34D',
      headerBg: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
      badgeBg: '#FEF3C7',
      badgeText: '#92400E',
      badgeLabel: 'Segera Habis',
      badgeIcon: AlertTriangle,
      textColor: '#92400E',
      taglineBg: 'rgba(255,255,255,0.15)',
    },
    expired: {
      icon: XCircle,
      iconColor: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
      headerBg: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
      badgeBg: '#FEE2E2',
      badgeText: '#991B1B',
      badgeLabel: 'Riksa Uji Expired',
      badgeIcon: XCircle,
      textColor: '#991B1B',
      taglineBg: 'rgba(255,255,255,0.15)',
    },
    unknown: {
      icon: AlertCircle,
      iconColor: '#6B7280',
      bgColor: '#F9FAFB',
      borderColor: '#E5E7EB',
      headerBg: 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
      badgeBg: '#F3F4F6',
      badgeText: '#374151',
      badgeLabel: 'Belum Ada Data',
      badgeIcon: AlertCircle,
      textColor: '#374151',
      taglineBg: 'rgba(255,255,255,0.15)',
    },
  };

  const cfg = statusConfig[riksaStatus];
  const StatusIcon = cfg.icon;
  const BadgeIcon = cfg.badgeIcon;

  const infoRows = [
    { icon: Tag, label: 'Kategori', value: equipment.category },
    { icon: Building2, label: 'Departemen', value: equipment.department || '-' },
    { icon: Wrench, label: 'Tipe / Model', value: equipment.equipmentType || '-' },
    { icon: Building2, label: 'Merk', value: equipment.brand || '-' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Hero Header */}
      <div style={{
        background: cfg.headerBg,
        padding: '32px 20px 48px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -20,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.taglineBg, border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 99, padding: '5px 14px', marginBottom: 20,
        }}>
          <BadgeIcon size={13} color="#fff" />
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {cfg.badgeLabel}
          </span>
        </div>

        {/* Equipment No & Name */}
        <h1 style={{
          fontSize: 42, fontWeight: 800, color: '#fff',
          letterSpacing: '-0.02em', marginBottom: 4, lineHeight: 1,
          fontFamily: 'monospace',
        }}>
          {equipment.equipmentNo}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: 500 }}>
          {equipment.equipmentName || '-'}
        </p>

        {/* Status Icon Large */}
        <div style={{
          position: 'absolute', top: 28, right: 24,
          width: 56, height: 56,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <StatusIcon size={28} color="#fff" />
        </div>
      </div>

      {/* Main Card */}
      <div style={{ maxWidth: 480, margin: '-20px auto 0', padding: '0 16px 32px', position: 'relative' }}>

        {/* Riksa Uji Status Card */}
        <div style={{
          background: cfg.bgColor,
          border: `1.5px solid ${cfg.borderColor}`,
          borderRadius: 16,
          padding: '16px 18px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <StatusIcon size={22} color={cfg.iconColor} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: cfg.textColor, marginBottom: 2 }}>
              {riksaStatus === 'active' && 'Riksa Uji Masih Berlaku'}
              {riksaStatus === 'warning' && 'Riksa Uji Akan Segera Berakhir'}
              {riksaStatus === 'expired' && 'Riksa Uji Sudah Expired!'}
              {riksaStatus === 'unknown' && 'Data Riksa Uji Belum Tersedia'}
            </p>
            {equipment.nextInspectionDate && (
              <p style={{ fontSize: 12, color: cfg.textColor, opacity: 0.75 }}>
                {riksaStatus === 'expired' ? 'Jatuh tempo' : 'Berlaku hingga'}: {formatDate(equipment.nextInspectionDate)}
              </p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #E5E7EB',
          overflow: 'hidden', marginBottom: 12,
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Informasi Peralatan
            </p>
          </div>
          {infoRows.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 18px',
              borderBottom: i < infoRows.length - 1 ? '1px solid #F9FAFB' : 'none',
            }}>
              <row.icon size={15} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#9CA3AF', width: 90, flexShrink: 0 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Riksa Uji Detail */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '1px solid #E5E7EB',
          overflow: 'hidden', marginBottom: 12,
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Jadwal Riksa Uji
            </p>
          </div>
          {[
            { label: 'Riksa Uji Terakhir', value: formatDate(equipment.lastInspectionDate) },
            { label: 'Masa Berlaku', value: equipment.validityPeriod || '-' },
            { label: 'Riksa Uji Berikutnya', value: formatDate(equipment.nextInspectionDate), highlight: true },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 18px',
              borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none',
              background: row.highlight && riksaStatus !== 'active' ? cfg.bgColor : 'transparent',
            }}>
              <Calendar size={15} color={row.highlight ? cfg.iconColor : '#9CA3AF'} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#9CA3AF', width: 140, flexShrink: 0 }}>{row.label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, flex: 1,
                color: row.highlight ? cfg.iconColor : '#111827',
              }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Riwayat inspeksi singkat */}
        {equipment.inspections && equipment.inspections.length > 0 && (
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1px solid #E5E7EB',
            overflow: 'hidden', marginBottom: 12,
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Riksa Uji Terakhir Dicatat
              </p>
            </div>
            {equipment.inspections.slice(0, 2).map((insp, i, arr) => (
              <div key={insp.id} style={{
                padding: '13px 18px',
                borderBottom: i < arr.length - 1 ? '1px solid #F9FAFB' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                  background: insp.status === 'Good' ? '#059669' : insp.status === 'Needs Repair' ? '#D97706' : '#DC2626',
                }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{insp.type}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{insp.notes || 'Tidak ada catatan'}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>oleh {insp.performedBy} · {formatDate(insp.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Login CTA */}
        <div style={{
          background: '#0D1117', borderRadius: 16,
          padding: '20px 18px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              Anda seorang petugas?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              Login untuk mengupdate status dan mencatat riwayat riksa uji peralatan ini.
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#1D4ED8', color: '#fff', border: 'none',
              borderRadius: 12, padding: '13px 20px',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%',
            }}
          >
            <LogIn size={16} /> Login sebagai Petugas
          </button>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', fontSize: 11, color: '#9CA3AF',
          marginTop: 20, fontWeight: 500,
        }}>
          EHS Equipment Testing System · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
