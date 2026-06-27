import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const clients = new Map<string, SupabaseClient>();

export const getSupabaseClient = (url: string, key: string): SupabaseClient => {
  const cacheKey = `${url}|${key}`;
  const existing = clients.get(cacheKey);
  if (existing) return existing;

  const client = createClient(url, key);
  clients.set(cacheKey, client);
  return client;
};
