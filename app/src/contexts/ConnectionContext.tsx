import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { enableNetwork } from "firebase/firestore";
import { db } from "../config/firebase";
import { logError } from "../utils/errorHandler";
import {
  Alert,
  Snackbar,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";
import WifiOffIcon from "@mui/icons-material/WifiOff";

/**
 * Connection Monitor — Yêu Cầu 10, Criteria 4-6
 * - Detect offline/online state
 * - Auto-retry connection (5s × 3 max)
 * - Show banner when offline
 * - Firestore persistence handles cache + auto-sync
 */

interface ConnectionContextType {
  isOnline: boolean;
  retryCount: number;
}

export const ConnectionContext = createContext<ConnectionContextType>({
  isOnline: true,
  retryCount: 0,
});

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 5000;

export function ConnectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRetryingRef = useRef(false);

  const attemptReconnect = useCallback(async () => {
    if (isRetryingRef.current) return;
    isRetryingRef.current = true;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      setRetryCount(attempt);
      try {
        await enableNetwork(db);
        // If enableNetwork succeeds and browser is online, we're back
        if (navigator.onLine) {
          setIsOnline(true);
          setRetryCount(0);
          isRetryingRef.current = false;
          console.log("[Connection] Kết nối phục hồi thành công");
          return;
        }
      } catch (err) {
        logError(err, "ConnectionContext.attemptReconnect", { attempt });
      }

      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => {
          retryTimerRef.current = setTimeout(resolve, RETRY_INTERVAL_MS);
        });
      }
    }

    isRetryingRef.current = false;
    setRetryCount(0);
    console.warn("[Connection] Không thể kết nối lại sau 3 lần thử");
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      console.log("[Connection] Trình duyệt online");
      setIsOnline(true);
      setRetryCount(0);
      enableNetwork(db).catch((err) =>
        logError(err, "ConnectionContext.handleOnline"),
      );
    };

    const handleOffline = () => {
      console.warn("[Connection] Mất kết nối mạng");
      setIsOnline(false);
      logError(new Error("Network offline"), "ConnectionContext.handleOffline");
      attemptReconnect();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [attemptReconnect]);

  return (
    <ConnectionContext.Provider value={{ isOnline, retryCount }}>
      {children}

      {/* Offline Banner */}
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity="warning"
          icon={<WifiOffIcon />}
          sx={{
            width: "100%",
            maxWidth: 600,
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight={600}>
              Mất kết nối mạng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {retryCount > 0
                ? `Đang thử kết nối lại... (lần ${retryCount}/${MAX_RETRIES})`
                : "Dữ liệu được lưu tạm. Hệ thống sẽ tự đồng bộ khi có kết nối."}
            </Typography>
            {retryCount > 0 && (
              <LinearProgress
                sx={{ mt: 0.5, borderRadius: 1 }}
                variant="indeterminate"
              />
            )}
          </Box>
        </Alert>
      </Snackbar>
    </ConnectionContext.Provider>
  );
}
