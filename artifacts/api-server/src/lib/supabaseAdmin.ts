import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? "";

class FakeWebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = FakeWebSocket.CONNECTING;
  constructor(_url: string, _protocols?: string | string[]) {
    super();
  }
  close() {}
  send(_data: unknown) {}
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: FakeWebSocket as unknown as typeof WebSocket },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

export function getAuthClient(userToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: FakeWebSocket as unknown as typeof WebSocket },
  });
}
