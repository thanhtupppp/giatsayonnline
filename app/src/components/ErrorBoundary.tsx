import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { logError } from '../utils/errorHandler';

/**
 * Global Error Boundary — Yêu Cầu 10, Criteria 10
 * Catches unhandled JS errors and displays a friendly message
 * without leaking technical details.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Criteria 9: Log full error for admin
    logError(error, 'ErrorBoundary', {
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            p: 3,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 5,
              textAlign: 'center',
              maxWidth: 480,
              borderRadius: 3,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom fontWeight={600}>
              Đã xảy ra lỗi
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Hệ thống gặp sự cố không mong muốn. Dữ liệu của bạn được bảo toàn an toàn.
              Vui lòng thử lại hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={this.handleRetry}
              sx={{ mr: 1 }}
            >
              Thử lại
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => window.location.reload()}
            >
              Tải lại trang
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}
