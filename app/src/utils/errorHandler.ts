/**
 * Centralized Error Handler — Yêu Cầu 10
 * - Criteria 9: Log chi tiết để quản trị viên kiểm tra
 * - Criteria 10: Thông báo thân thiện, không để lộ thông tin kỹ thuật
 */

// ===== ERROR CODES → VIETNAMESE MESSAGES =====
const FIRESTORE_ERROR_MAP: Record<string, string> = {
  "permission-denied": "Bạn không có quyền thực hiện thao tác này.",
  "not-found": "Dữ liệu không tồn tại hoặc đã bị xóa.",
  "already-exists": "Dữ liệu đã tồn tại.",
  "resource-exhausted": "Hệ thống đang quá tải, vui lòng thử lại sau.",
  "failed-precondition":
    "Không thể thực hiện thao tác trong trạng thái hiện tại.",
  aborted: "Thao tác bị hủy do xung đột dữ liệu, vui lòng thử lại.",
  unavailable: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
  "deadline-exceeded": "Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.",
  unauthenticated: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  cancelled: "Thao tác đã bị hủy.",
  "data-loss": "Lỗi dữ liệu. Vui lòng liên hệ quản trị viên.",
  internal: "Lỗi hệ thống. Vui lòng thử lại sau.",
  "invalid-argument": "Dữ liệu không hợp lệ, vui lòng kiểm tra lại.",
  "out-of-range": "Giá trị nằm ngoài phạm vi cho phép.",
  unimplemented: "Tính năng này chưa được hỗ trợ.",
};

const AUTH_ERROR_MAP: Record<string, string> = {
  "auth/user-not-found": "Tài khoản không tồn tại.",
  "auth/wrong-password": "Mật khẩu không chính xác.",
  "auth/email-already-in-use": "Email đã được sử dụng.",
  "auth/weak-password": "Mật khẩu quá yếu (tối thiểu 6 ký tự).",
  "auth/invalid-email": "Địa chỉ email không hợp lệ.",
  "auth/too-many-requests": "Quá nhiều lần thử. Vui lòng đợi vài phút.",
  "auth/network-request-failed": "Không thể kết nối. Kiểm tra kết nối mạng.",
};

const DEFAULT_USER_MESSAGE = "Đã xảy ra lỗi. Vui lòng thử lại sau.";

// ===== ERROR LOGGER (Criteria 9) =====
interface ErrorLogEntry {
  timestamp: string;
  context: string;
  message: string;
  code?: string;
  stack?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

const errorLogs: ErrorLogEntry[] = [];
const MAX_LOG_ENTRIES = 200;

export function logError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>,
): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    context,
    message: error instanceof Error ? error.message : safeToString(error),
    code: getErrorCode(error),
    stack: error instanceof Error ? error.stack : undefined,
    extra,
  };

  // Structured console log for admin inspection
  console.error(`[ERROR] [${entry.context}]`, {
    ...entry,
    raw: error,
  });

  // Keep in-memory log (capped)
  errorLogs.push(entry);
  if (errorLogs.length > MAX_LOG_ENTRIES) {
    errorLogs.splice(0, errorLogs.length - MAX_LOG_ENTRIES);
  }
}

/** Get recent error logs (admin only) */
export function getErrorLogs(): ErrorLogEntry[] {
  return [...errorLogs];
}

// ===== USER-FRIENDLY MESSAGE (Criteria 10) =====
export function getUserMessage(error: unknown): string {
  const code = getErrorCode(error);

  // Check Firestore errors
  if (code && FIRESTORE_ERROR_MAP[code]) {
    return FIRESTORE_ERROR_MAP[code];
  }

  // Check Auth errors
  if (code && AUTH_ERROR_MAP[code]) {
    return AUTH_ERROR_MAP[code];
  }

  // Vietnamese business-logic errors (from service layer) — pass through
  if (error instanceof Error && isVietnameseMessage(error.message)) {
    return error.message;
  }

  return DEFAULT_USER_MESSAGE;
}

// ===== NETWORK ERROR DETECTION (Criteria 4) =====
export function isNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code === "unavailable" || code === "auth/network-request-failed") {
    return true;
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("offline") ||
      msg.includes("failed to fetch")
    );
  }
  return false;
}

// ===== HELPERS =====
function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object") {
    const e = error as { code?: string };
    return e.code;
  }
  return undefined;
}

function isVietnameseMessage(msg: string): boolean {
  // Detect Vietnamese characters or known Vietnamese patterns
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(
    msg,
  );
}

function safeToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  if (value === null || value === undefined) return String(value);
  if (value instanceof Error) return value.message;

  try {
    return JSON.stringify(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
