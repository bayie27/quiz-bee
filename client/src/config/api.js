const serverUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '';

export const apiPath = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!serverUrl) return normalizedPath;
  return `${serverUrl.replace(/\/$/, '')}${normalizedPath}`;
};
