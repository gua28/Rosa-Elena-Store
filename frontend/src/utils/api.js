// Central API configuration
// In development (localhost), use localhost:8000
// In production (Vercel), use the Render backend URL
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_BASE_URL = isDevelopment
  ? `http://localhost:8000`
  : `https://rosa-elena-store.onrender.com`;
