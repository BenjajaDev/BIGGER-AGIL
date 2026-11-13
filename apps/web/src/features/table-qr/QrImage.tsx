import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** The QR drawn in the browser as an image: the address never leaves this device. */
export function QrImage({ value, label }: { value: string; label: string }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { margin: 1, errorCorrectionLevel: 'M', width: 320 })
      .then((url) => {
        if (active) setSource(url);
      })
      .catch(() => {
        if (active) setSource(null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (source === null) return <p role="status">Generando el QR…</p>;
  return <img src={source} alt={label} width={192} height={192} />;
}
