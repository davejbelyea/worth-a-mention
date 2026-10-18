export const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
export const GOOGLE_ENABLED = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const EMAIL_ENABLED = Boolean(process.env.RESEND_API_KEY);
export const IS_PROD = process.env.NODE_ENV === "production";
export const TZ = "America/New_York";
