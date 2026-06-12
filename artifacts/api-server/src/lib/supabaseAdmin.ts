import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { transport: ws as unknown as typeof WebSocket },
});
