import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: ws as unknown as typeof WebSocket },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

export function getAuthClient(userToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  });
}
