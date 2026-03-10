import { useState, useEffect, useCallback } from 'react'

interface JobLog {
  id: string
  orderCode: string
  status: string
  msg?: string
  time: string
}

function App(): React.JSX.Element {
  const [storeId, setStoreId] = useState(() => localStorage.getItem('storeId') || '')
  const [stores, setStores] = useState<{id: string, name: string}[]>([])
  const [loadingStores, setLoadingStores] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [fbInit, setFbInit] = useState(false)
  const [fbError, setFbError] = useState<string | null>(null)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [logs, setLogs] = useState<JobLog[]>([])
  const [showGuide, setShowGuide] = useState(false)

  const loadStores = useCallback(async () => {
    setLoadingStores(true)
    setStoreError(null)
    try {
      const result = await window.api.getStores()
      setStores(result.stores || [])
      if (result.error) setStoreError(result.error)
      return result.stores || []
    } catch (err: any) {
      setStoreError(`Lỗi gọi getStores: ${err?.message || err}`)
      setStores([])
      return []
    } finally {
      setLoadingStores(false)
    }
  }, [])

  useEffect(() => {
    const checkFb = async () => {
      const result = await window.api.initFirebase()
      const isOk = result?.success === true
      setFbInit(isOk)
      if (!isOk) {
        setFbError(result?.error || 'Không thể khởi tạo Firebase')
        return
      }
      setFbError(null)

      const storeList = await loadStores()

      const savedId = localStorage.getItem('storeId')
      if (savedId && storeList.some((s: any) => s.id === savedId)) {
        handleStart(savedId)
      }
    }
    checkFb()

    window.api.onJobStart((data: any) => {
      setLogs(prev => [{
        id: data.jobId,
        orderCode: data.orderCode,
        status: 'PRINTING',
        time: new Date().toLocaleTimeString()
      }, ...prev].slice(0, 50))
    })

    window.api.onJobEnd((data: any) => {
      setLogs(prev => prev.map(log => 
        log.id === data.jobId 
          ? { ...log, status: data.status, msg: data.msg }
          : log
      ))
    })
  }, [])

  const handleStart = async (targetStoreId = storeId) => {
    if (!targetStoreId.trim()) return alert('Vui lòng chọn Cửa Hàng')
    
    localStorage.setItem('storeId', targetStoreId)
    
    const success = await window.api.startListening(targetStoreId)
    if (success) {
      setIsListening(true)
      const st = stores.find(x => x.id === targetStoreId)
      const displayName = st ? st.name : targetStoreId
      setLogs(prev => [{
        id: 'sys',
        orderCode: 'System',
        status: 'INFO',
        msg: `Đã bắt đầu lắng nghe cho cửa hàng: ${displayName}`,
        time: new Date().toLocaleTimeString()
      }, ...prev])
    } else {
      alert('Không thể bắt đầu (kiểm tra lại kết nối Firebase)')
    }
  }

  const handleStop = async () => {
    await window.api.stopListening()
    setIsListening(false)
    setLogs(prev => [{
      id: 'sys',
      orderCode: 'System',
      status: 'INFO',
      msg: `Đã dừng lắng nghe lệnh in.`,
      time: new Date().toLocaleTimeString()
    }, ...prev])
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          Giặt Sấy Online - Print Server
          <span style={{ fontSize: '14px', background: '#eee', padding: '4px 8px', borderRadius: '12px', color: '#666', fontWeight: 'normal' }}>v1.0.1</span>
        </h1>
        <button 
          onClick={() => setShowGuide(true)}
          style={{ 
            padding: '8px 16px', 
            background: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          📖 Hướng dẫn sử dụng
        </button>
      </div>
      
      {!fbInit && (
        <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#fff3f3', border: '1px solid #ffcccc', borderRadius: '6px' }}>
          <strong>❌ Lỗi Firebase:</strong> {fbError || 'Không tìm thấy file serviceAccountKey.json'}
          <br/>
          <span style={{ fontSize: '13px', color: '#666' }}>Vui lòng copy file <code>serviceAccountKey.json</code> vào cùng thư mục chạy app.</span>
        </div>
      )}

      {storeError && (
        <div style={{ color: '#e65100', marginBottom: '15px', padding: '10px', background: '#fff8e1', border: '1px solid #ffe0b2', borderRadius: '6px' }}>
          <strong>⚠️ Lỗi tải cửa hàng:</strong> {storeError}
        </div>
      )}

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3 style={{ marginTop: 0 }}>Cấu hình Kết Nối</h3>
        <label style={{ display: 'block', marginBottom: '10px' }}>
          Cửa Hàng: <br/>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
            <select 
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={isListening || loadingStores}
              style={{ padding: '8px', fontSize: '16px', width: '300px' }}
            >
              <option value="">-- Chọn Cửa Hàng --</option>
              {stores.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
            {loadingStores && <span style={{ fontSize: 13, color: '#666' }}>Đang tải...</span>}
            {!isListening && fbInit && !loadingStores && (
              <button 
                onClick={loadStores}
                style={{ 
                  padding: '8px 12px', background: '#fff', border: '1px solid #ccc', 
                  borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                  display: 'flex', alignItems: 'center', gap: '4px'
                }}
                title="Tải lại danh sách cửa hàng"
              >
                🔄 Thử lại
              </button>
            )}
          </div>
        </label>
        
        {isListening ? (
          <button onClick={handleStop} style={{ padding: '10px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Dừng Lắng Nghe
          </button>
        ) : (
          <button onClick={() => handleStart()} disabled={!fbInit || !storeId} style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: (!fbInit || !storeId) ? 0.5 : 1 }}>
            Bắt Đầu Kết Nối
          </button>
        )}
      </div>

      <div>
        <h3>Nhật ký In Ấn (Tự động)</h3>
        <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '10px', background: '#f9f9f9' }}>
          {logs.length === 0 ? (
            <div style={{ color: '#888' }}>Chưa có sự kiện nào...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                <span style={{ color: '#888', marginRight: '10px' }}>[{log.time}]</span>
                <strong>{log.orderCode}</strong>
                <span style={{ 
                  margin: '0 10px',
                  color: log.status === 'SUCCESS' ? 'green' : log.status === 'FAILED' ? 'red' : log.status === 'PRINTING' ? 'blue' : 'gray' 
                }}>
                  {log.status}
                </span>
                {log.msg && <span>- <em>{log.msg}</em></span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Hướng dẫn sử dụng */}
      {showGuide && (
        <div 
          onClick={() => setShowGuide(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '12px', padding: '30px',
              maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#1565C0' }}>📖 Hướng Dẫn Sử Dụng</h2>
              <button 
                onClick={() => setShowGuide(false)} 
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#999' }}
              >
                ✕
              </button>
            </div>

            <div style={{ lineHeight: '1.8', fontSize: '14px' }}>
              <h3 style={{ color: '#1565C0', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px' }}>
                🚀 Bắt đầu ca làm việc
              </h3>
              <ol style={{ paddingLeft: '20px' }}>
                <li>Mở ứng dụng <strong>Giặt Sấy Online - Print</strong> trên máy tính quầy</li>
                <li>Chọn <strong>cửa hàng của bạn</strong> từ danh sách</li>
                <li>Nhấn nút <strong style={{ color: '#4CAF50' }}>Bắt Đầu Kết Nối</strong></li>
                <li>Trang <strong>quản lý đơn hàng (POS)</strong> sẽ tự động mở trên trình duyệt</li>
                <li>✅ Xong! App sẽ chạy ngầm và tự động in phiếu</li>
              </ol>

              <h3 style={{ color: '#1565C0', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px' }}>
                🖨️ In phiếu tự động
              </h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Khi bạn <strong>tạo đơn hàng mới</strong> trên trang POS, phiếu sẽ <strong>tự động in ra</strong> — không cần bấm gì thêm</li>
                <li>Mỗi đơn sẽ in <strong>1 phiếu tiếp nhận</strong> cho khách (có mã vạch, danh sách dịch vụ, tổng tiền)</li>
                <li>Nếu có tên khách hàng, sẽ in thêm <strong>1 tem dán đồ giặt</strong> để gắn lên túi đồ</li>
              </ul>

              <h3 style={{ color: '#1565C0', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px' }}>
                📋 Theo dõi trạng thái in
              </h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Phần <strong>"Nhật ký In Ấn"</strong> phía dưới hiển thị lịch sử in</li>
                <li><span style={{ color: 'blue', fontWeight: 'bold' }}>Đang in...</span> — máy đang xử lý lệnh in</li>
                <li><span style={{ color: 'green', fontWeight: 'bold' }}>Thành công ✓</span> — phiếu đã in xong</li>
                <li><span style={{ color: 'red', fontWeight: 'bold' }}>Lỗi ✗</span> — có sự cố, xem hướng dẫn bên dưới</li>
              </ul>

              <h3 style={{ color: '#1565C0', borderBottom: '2px solid #e3f2fd', paddingBottom: '8px' }}>
                ❓ Khi gặp sự cố
              </h3>
              <ul style={{ paddingLeft: '20px' }}>
                <li><strong>Phiếu không in ra?</strong> Kiểm tra máy in đã bật và có giấy. Thử nhấn <strong style={{ color: '#f44336' }}>Dừng Lắng Nghe</strong> rồi nhấn lại <strong style={{ color: '#4CAF50' }}>Bắt Đầu Kết Nối</strong></li>
                <li><strong>Máy in kẹt giấy?</strong> Tắt máy in, gỡ giấy ra, bật lại. Phiếu sẽ tự in lại</li>
                <li><strong>App bị đơ?</strong> Đóng app rồi mở lại. App sẽ tự kết nối lại cửa hàng đã chọn</li>
                <li><strong>Vẫn không được?</strong> Liên hệ quản lý hoặc bộ phận kỹ thuật hỗ trợ</li>
              </ul>

              <div style={{ 
                marginTop: '20px', padding: '12px', background: '#e8f5e9', 
                borderRadius: '8px', fontSize: '13px', color: '#2e7d32' 
              }}>
                💡 <strong>Mẹo:</strong> Bạn chỉ cần mở app 1 lần đầu ca. App sẽ nhớ cửa hàng và tự kết nối — không cần thao tác lại mỗi lần!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

