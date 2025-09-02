// utils/apiBase.ts
export function apiBase() {
  const b = import.meta.env.VITE_API_BASE?.trim();
  if (!b) throw new Error("VITE_API_BASE is not set");
  return b.replace(/\/+$/, "");
}