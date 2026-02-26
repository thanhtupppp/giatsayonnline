import Barcode from 'react-barcode';
import type { DonHang } from '../../types';
import { formatCurrency } from '../../utils/constants';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PrintReceiptProps {
  donHang: DonHang;
  tenCuaHang?: string;
  diaChiCuaHang?: string;
  sdtCuaHang?: string;
}

/**
 * Print-optimized receipt using INLINE styles (not MUI sx).
 * Inline styles survive innerHTML copy to print iframe.
 */
export default function PrintReceipt({ donHang, tenCuaHang, diaChiCuaHang, sdtCuaHang }: PrintReceiptProps) {
  const formatDate = (ts: any) => ts?.toDate ? format(ts.toDate(), 'dd/MM/yyyy HH:mm', { locale: vi }) : '-';

  const divider = { borderTop: '1px dashed #000', margin: '6px 0' } as React.CSSProperties;

  return (
    <div style={{ width: 300, margin: '0 auto', fontFamily: 'monospace', fontSize: 12, padding: 8 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'monospace' }}>
          {tenCuaHang || 'CỬA HÀNG GIẶT SẤY'}
        </div>
        {diaChiCuaHang && <div style={{ fontSize: 10 }}>ĐC: {diaChiCuaHang}</div>}
        {sdtCuaHang && <div style={{ fontSize: 10 }}>ĐT: {sdtCuaHang}</div>}
      </div>

      <hr style={divider} />

      {/* Order Info */}
      <div style={{ fontWeight: 700, textAlign: 'center', fontSize: 14, margin: '4px 0' }}>
        PHIẾU TIẾP NHẬN
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11 }}>Mã: <strong>{donHang.maDonHang}</strong></span>
        <span style={{ fontSize: 11 }}>{formatDate(donHang.ngayTao)}</span>
      </div>
      <div style={{ fontSize: 11 }}>Hẹn trả: <strong>{formatDate(donHang.ngayHenTra)}</strong></div>

      <hr style={divider} />

      {/* Services */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 700, padding: '2px 4px' }}>Dịch vụ</td>
            <td style={{ fontWeight: 700, padding: '2px 4px', textAlign: 'right' }}>SL/KG</td>
            <td style={{ fontWeight: 700, padding: '2px 4px', textAlign: 'right' }}>T.Tiền</td>
          </tr>
          {donHang.danhSachDichVu.map((dv, i) => (
            <tr key={i}>
              <td style={{ padding: '2px 4px' }}>{dv.tenDichVu}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right' }}>{dv.trongLuong > 0 ? `${dv.trongLuong}kg` : dv.soLuong}</td>
              <td style={{ padding: '2px 4px', textAlign: 'right' }}>{formatCurrency(dv.thanhTien)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr style={divider} />

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
        <span>TỔNG CỘNG</span>
        <span>{formatCurrency(donHang.tongTien)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span>Đã trả</span>
        <span>{formatCurrency(donHang.tienDaTra)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'monospace' }}>
        <span>Còn lại</span>
        <span style={{ fontWeight: 700 }}>{formatCurrency(donHang.tienConLai)}</span>
      </div>

      <hr style={divider} />

      {/* Barcode */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <Barcode
          value={donHang.maDonHang}
          width={2}
          height={50}
          fontSize={10}
          margin={0}
          displayValue={true}
        />
      </div>

      {/* Footer */}
      <hr style={divider} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontStyle: 'italic' }}>Cảm ơn quý khách!</div>
        <div style={{ fontSize: 9, color: '#666' }}>Vui lòng giữ phiếu này để nhận đồ</div>
      </div>
    </div>
  );
}
