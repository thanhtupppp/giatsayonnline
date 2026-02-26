import Barcode from 'react-barcode';
import type { DonHang } from '../../types';

interface PrintLaundryTagProps {
  donHang: DonHang;
  tenKhachHang: string;
}

/**
 * Print-optimized laundry tag using INLINE styles (not MUI sx).
 * Compact tag to stick on the washing machine / clothes.
 * Shows: large customer name + barcode (maDonHang)
 */
export default function PrintLaundryTag({ donHang, tenKhachHang }: PrintLaundryTagProps) {
  const divider = { borderTop: '1px dashed #000', margin: '8px 0' } as React.CSSProperties;

  return (
    <div style={{ width: 300, margin: '0 auto', fontFamily: 'monospace', padding: 8, textAlign: 'center' }}>
      {/* Large customer name */}
      <div style={{
        fontWeight: 900,
        fontSize: 28,
        fontFamily: 'sans-serif',
        lineHeight: 1.2,
        marginBottom: 8,
        wordBreak: 'break-word',
      }}>
        {tenKhachHang}
      </div>

      <hr style={divider} />

      {/* Barcode */}
      <div style={{ margin: '8px 0' }}>
        <Barcode
          value={donHang.maDonHang}
          width={2}
          height={50}
          fontSize={12}
          margin={0}
          displayValue={true}
        />
      </div>

      <hr style={divider} />

      {/* Cut line hint */}
      <div style={{ fontSize: 9, color: '#666', fontStyle: 'italic' }}>
        ✂ Dán lên đồ giặt / máy giặt
      </div>
    </div>
  );
}
