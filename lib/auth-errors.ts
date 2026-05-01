/**
 * Centralized Firebase Auth error messages.
 * Tambahkan error code baru di sini tanpa perlu menyentuh komponen.
 *
 * Referensi lengkap: https://firebase.google.com/docs/auth/admin/errors
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // --- Email / Password ---
  "auth/email-already-in-use": "Email ini sudah terdaftar. Silakan login.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-not-found": "Email atau password salah.",
  "auth/wrong-password": "Email atau password salah.",
  "auth/invalid-credential": "Email atau password salah.",
  "auth/weak-password": "Password terlalu lemah, minimal 6 karakter.",
  "auth/user-disabled": "Akun ini telah dinonaktifkan. Hubungi administrator.",

  // --- Google / OAuth ---
  "auth/popup-closed-by-user": "Login dibatalkan. Silakan coba lagi.",
  "auth/popup-blocked":
    "Popup diblokir oleh browser. Izinkan popup dan coba lagi.",
  "auth/cancelled-popup-request": "Permintaan login dibatalkan.",
  "auth/account-exists-with-different-credential":
    "Email ini sudah terdaftar dengan metode login lain.",

  // --- Network / Rate limit ---
  "auth/network-request-failed":
    "Koneksi gagal. Periksa jaringan Anda dan coba lagi.",
  "auth/too-many-requests":
    "Terlalu banyak percobaan. Coba lagi beberapa saat.",

  // --- Token / Session ---
  "auth/requires-recent-login": "Sesi Anda kedaluwarsa. Silakan login ulang.",
  "auth/id-token-expired": "Sesi Anda kedaluwarsa. Silakan login ulang.",
};

const DEFAULT_ERROR_MESSAGE = "Terjadi kesalahan. Silakan coba lagi.";

/**
 * Mengubah Firebase AuthError menjadi pesan yang ramah pengguna.
 *
 * @param err - Error yang dilempar oleh Firebase Auth
 * @returns Pesan error dalam Bahasa Indonesia
 *
 * @example
 * } catch (err) {
 *   setError(getAuthErrorMessage(err));
 * }
 */
export function getAuthErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
}
