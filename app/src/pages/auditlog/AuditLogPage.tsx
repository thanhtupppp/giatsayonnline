import { Fragment, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, CircularProgress,
  TextField, IconButton, Tooltip, Collapse,
} from '@mui/material';
import { Search, ExpandMore, ExpandLess } from '@mui/icons-material';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  collection, getDocs, query, where, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { AuditLog } from '../../types';
import { VaiTro } from '../../types';

export default function AuditLogPage() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  // TC 6: Filter by userId, action, and date range
  const [filterAction, setFilterAction] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const constraints: any[] = [];

      if (userProfile?.vaiTro !== VaiTro.SUPER_ADMIN && userProfile?.maCuaHang) {
        constraints.push(where('maCuaHang', '==', userProfile.maCuaHang));
      }

      // TC 6: Date range filter
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        constraints.push(where('timestamp', '>=', Timestamp.fromDate(fromDate)));
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        constraints.push(where('timestamp', '<=', Timestamp.fromDate(toDate)));
      }

      // Removed orderBy('timestamp', 'desc') to avoid missing composite index error
      constraints.push(limit(200));

      const q = query(collection(db, 'auditLog'), ...constraints);
      const snap = await getDocs(q);
      
      const parsedLogs = snap.docs.map((d) => ({ maLog: d.id, ...d.data() }) as AuditLog);
      // In-memory sort by timestamp descending
      parsedLogs.sort((a, b) => {
        const ta = a.timestamp?.toDate?.() || new Date(0);
        const tb = b.timestamp?.toDate?.() || new Date(0);
        return tb.getTime() - ta.getTime();
      });
      
      setLogs(parsedLogs);
    } catch (err: any) {
      console.error('AuditLog Error:', err);
      toast.error('Lỗi tải nhật ký: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  // TC 6: Client-side filtering for userId and action
  const filtered = logs.filter((l) => {
    if (filterAction && !l.action.toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (filterUserId && !l.userId.toLowerCase().includes(filterUserId.toLowerCase())) return false;
    return true;
  });

  const formatDate = (ts: any) => ts?.toDate ? format(ts.toDate(), 'dd/MM/yyyy HH:mm:ss', { locale: vi }) : '-';

  const actionColor = (action: string) => {
    if (action.includes('create') || action.includes('tao')) return 'success' as const;
    if (action.includes('update') || action.includes('cap_nhat') || action.includes('status')) return 'primary' as const;
    if (action.includes('delete') || action.includes('xoa')) return 'error' as const;
    if (action.includes('login') || action.includes('dang_nhap')) return 'warning' as const;
    return 'default' as const;
  };

  const formatData = (data: any) => {
    if (!data) return '-';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Nhật ký kiểm toán</Typography>

      {/* TC 6: Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Lọc theo action..." value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)} sx={{ width: 200 }} />
        <TextField size="small" placeholder="Lọc theo User ID..." value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)} sx={{ width: 200 }} />
        <TextField size="small" type="date" label="Từ ngày" value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
        <TextField size="small" type="date" label="Đến ngày" value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
        <Tooltip title="Tìm kiếm">
          <IconButton onClick={loadLogs} color="primary">
            <Search />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Hiển thị {filtered.length} / {logs.length} log
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 600, width: 40 }}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>User ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Mã cửa hàng</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  Chưa có log nào
                </TableCell></TableRow>
              ) : filtered.map((log) => (
                <Fragment key={log.maLog}>
                  <TableRow hover sx={{ cursor: 'pointer' }}
                    onClick={() => setExpandedRow(expandedRow === log.maLog ? null : log.maLog)}>
                    <TableCell>
                      {expandedRow === log.maLog ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatDate(log.timestamp)}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.userId?.slice(0, 12)}...</TableCell>
                    <TableCell><Chip label={log.action} size="small" color={actionColor(log.action)} /></TableCell>
                    <TableCell>{log.maCuaHang || '-'}</TableCell>
                  </TableRow>
                  {/* TC 2: Show before/after data */}
                  {expandedRow === log.maLog && (
                    <TableRow key={`${log.maLog}-detail`}>
                      <TableCell colSpan={5} sx={{ py: 1, px: 3, bgcolor: 'grey.50' }}>
                        <Collapse in={true}>
                          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            {log.beforeData && (
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="caption" fontWeight={600} color="error.main">Trước:</Typography>
                                <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', bgcolor: 'error.50', p: 1, borderRadius: 1, mt: 0.5, overflow: 'auto', maxHeight: 150 }}>
                                  {formatData(log.beforeData)}
                                </Box>
                              </Box>
                            )}
                            {log.afterData && (
                              <Box sx={{ flex: 1, minWidth: 200 }}>
                                <Typography variant="caption" fontWeight={600} color="success.main">Sau:</Typography>
                                <Box component="pre" sx={{ fontSize: '0.75rem', fontFamily: 'monospace', bgcolor: 'success.50', p: 1, borderRadius: 1, mt: 0.5, overflow: 'auto', maxHeight: 150 }}>
                                  {formatData(log.afterData)}
                                </Box>
                              </Box>
                            )}
                            {!log.beforeData && !log.afterData && (
                              <Typography variant="caption" color="text.secondary">Không có dữ liệu chi tiết</Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
