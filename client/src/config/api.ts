const rawUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '') as string;
const serverUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl;

export const apiPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!serverUrl) return normalizedPath;
  return `${serverUrl.replace(/\/$/, '')}${normalizedPath}`;
};
