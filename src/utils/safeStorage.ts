export const safeGetItem = (key: string, fallback = '') => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (error) {
    console.warn(`Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
};

export const safeParseStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    return fallback;
  }
};
