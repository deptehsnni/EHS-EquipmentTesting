import React from 'react';

interface QRScannerProps {
  onScan: (id: string) => void;
  onBack: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onBack }) => {
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      <p>Gunakan halaman Public Scanner untuk scan QR.</p>
      <button onClick={onBack}>Kembali</button>
    </div>
  );
};
