import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Equipment, mapDbToEquipment, getRiksaUjiStatus, getRiksaUjiColor, riksaUjiStatusLabel, formatDate } from '../types';
import { QrCode, LogIn, AlertCircle, Upload, ChevronRight, RefreshCw } from 'lucide-react';

type ViewState = 'scan' | 'result' | 'error';

export const PublicScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>('scan');
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === 'scan') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [view]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          scanFrame();
        };
      }
    } catch {
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Use BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        detector.detect(canvas).then((codes: any[]) => {
          if (codes.length > 0) {
            handleScanResult(codes[0].rawValue);
          } else {
            animFrameRef.current = requestAnimationFrame(scanFrame);
          }
        }).catch(() => {
          animFrameRef.current = requestAnimationFrame(scanFrame);
        });
      } else {
        // Fallback: keep scanning
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
  };

  const handleScanResult = async (text: string) => {
    stopCamera();
    const eqNo = text.includes('/scan/') ? text.split('/scan/').pop()?.split('?')[0] : text;
    await fetchEquipment(eqNo || text);
  };

  const fetchEquipment = async (eqNo: string) => {
    const { data, error } = await supabase
      .from('equipments').select('*').eq('equipment_no', eqNo.trim()).single();
    if (error || !data) {
      setErrorMsg(`Peralatan "${eqNo}" tidak ditemukan dalam sistem.`);
      setView('error');
    } else {
      setEquipment(mapDbToEquipment(data));
      setView('result');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use BarcodeDetector on image file if available
    if ('BarcodeDetector' in window) {
      try {
        const bitmap = await createImageBitmap(file);
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        const codes = await detector.detect(bitmap);
        if (codes.length > 0) {
          stopCamera();
          await handleScanResult(codes[0].rawValue);
          e.target.value = '';
          return;
        }
      } catch {}
    }

    // Fallback: read as data URL and draw to canvas for detection
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setErrorMsg('QR code tidak dapat dibaca. Pastikan gambar jelas dan coba lagi.');
        setView('error');
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const resetScan = () => {
    setView('scan');
    setEquipment(null);
    setErrorMsg('');
    setCameraError(false);
  };

  const riksaStatus = equipment ? getRiksaUjiStatus(equipment.nextInspectionDate) : 'unknown';
  const riksaColor = equipment ? getRiksaUjiColor(riksaStatus) : getRiksaUjiColor('unknown');
  const dotColor = riksaStatus === 'active' ? '#16A34A' : riksaStatus === 'warning' ? '#D97706' : riksaStatus === 'expired' ? '#DC2626' : '#9CA3AF';

  return (
    <div style={{ minHeight: '100vh', background: '#0D1117', fontFamily: 'var(--font-sans)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: '#2D6BE4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QrCode size={15} color="#fff" />
          </div>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>EHS Equipment Testing</p>
            <p style={{ color: '#2D6BE4', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Public Scanner</p>
          </div>
        </div>
        <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <LogIn size={13} /> Login
        </button>
      </div>

      <div style={{ maxWidth: 440, margin: '0 auto', padding: '20px 16px' }}>

        {/* SCAN VIEW */}
        {view === 'scan' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Scan QR Peralatan</h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6 }}>Arahkan kamera ke QR code pada peralatan</p>
            </div>

            {cameraError ? (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 24px', textAlign: 'center' }}>
                <AlertCircle size={36} color="#9CA3AF" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>Kamera tidak dapat diakses. Gunakan fitur upload gambar di bawah.</p>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button onClick={() => fileRef.current?.click()} style={{ background: '#2D6BE4', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, margin: '0 auto' }}>
                  <Upload size={16} /> Upload Gambar QR
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#000', aspectRatio: '1', marginBottom: 16 }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Corner guides */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: 220, height: 220, position: 'relative' }}>
                    {[
                      { top: 0, left: 0, borderTop: '3px solid #2D6BE4', borderLeft: '3px solid #2D6BE4', borderRadius: '12px 0 0 0' },
                      { top: 0, right: 0, borderTop: '3px solid #2D6BE4', borderRight: '3px solid #2D6BE4', borderRadius: '0 12px 0 0' },
                      { bottom: 0, left: 0, borderBottom: '3px solid #2D6BE4', borderLeft: '3px solid #2D6BE4', borderRadius: '0 0 0 12px' },
                      { bottom: 0, right: 0, borderBottom: '3px solid #2D6BE4', borderRight: '3px solid #2D6BE4', borderRadius: '0 0 12px 0' },
                    ].map((style, i) => (
                      <div key={i} style={{ position: 'absolute', width: 32, height: 32, ...style }} />
                    ))}
                  </div>
                </div>

                {/* Scanning indicator */}
                <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>Scanning</span>
                </div>
              </div>
            )}

            {!cameraError && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <button onClick={() => fileRef.current?.click()} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', borderRadius: 14, height: 48, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Upload size={16} /> Upload Gambar QR Code
                </button>
              </div>
            )}
          </div>
        )}

        {/* RESULT VIEW */}
        {view === 'result' && equipment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Status card */}
            <div style={{
              borderRadius: 18, overflow: 'hidden',
              border: `1px solid ${riksaStatus === 'expired' ? 'rgba(239,68,68,0.3)' : riksaStatus === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
              background: riksaStatus === 'expired' ? 'rgba(239,68,68,0.08)' : riksaStatus === 'warning' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
            }}>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span style={{ color: dotColor, fontWeight: 700, fontSize: 13 }}>{riksaUjiStatusLabel[riksaStatus]}</span>
                {equipment.nextInspectionDate && (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 'auto' }}>{formatDate(equipment.nextInspectionDate)}</span>
                )}
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ color: '#fff', fontWeight: 800, fontSize: 28, fontFamily: 'monospace', letterSpacing: '-0.01em', lineHeight: 1, marginBottom: 4 }}>{equipment.equipmentNo}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>{equipment.equipmentName}</p>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              {[
                { label: 'Kategori', value: equipment.category },
                { label: 'Departemen', value: equipment.department || '-' },
                { label: 'Riksa Uji Terakhir', value: formatDate(equipment.lastInspectionDate) },
                { label: 'Masa Berlaku', value: equipment.validityPeriod || '-' },
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{r.label}</span>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ background: 'rgba(45,107,228,0.1)', border: '1px solid rgba(45,107,228,0.25)', borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 12 }}>Login sebagai petugas untuk update status inspeksi</p>
              <button onClick={() => navigate('/login')} style={{ background: '#2D6BE4', color: '#fff', border: 'none', borderRadius: 12, width: '100%', height: 46, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <LogIn size={15} /> Login sebagai Petugas
              </button>
            </div>

            <button onClick={resetScan} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', borderRadius: 12, height: 46, fontWeight: 600, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RefreshCw size={15} /> Scan Peralatan Lain
            </button>
          </div>
        )}

        {/* ERROR VIEW */}
        {view === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 18, padding: '32px 20px', textAlign: 'center' }}>
              <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 12px' }} />
              <h2 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Tidak Ditemukan</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{errorMsg}</p>
            </div>
            <button onClick={resetScan} style={{ background: '#2D6BE4', color: '#fff', border: 'none', borderRadius: 12, height: 48, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RefreshCw size={15} /> Coba Lagi
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
};
