const rawUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '') as string;
let processedUrl = rawUrl;
if (processedUrl && !processedUrl.includes('.') && !processedUrl.includes('localhost')) {
  processedUrl = `${processedUrl}.onrender.com`;
}
const serverUrl = processedUrl && !processedUrl.startsWith('http') ? `https://${processedUrl}` : processedUrl;

export const apiPath = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!serverUrl) return normalizedPath;
  return `${serverUrl.replace(/\/$/, '')}${normalizedPath}`;
};
