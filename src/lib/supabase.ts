import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase 연결 자리. 1단계는 데이터를 저장하지 않으므로 아직 아무 곳에서도 부르지 않습니다.
 * 환경 변수가 없으면 null 을 돌려주고, 있을 때만 라이브러리를 불러옵니다(번들에 포함되지 않음).
 * 카메라 영상이나 손 좌표는 이 클라이언트로 보내지 않습니다.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

let client: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> | null {
  if (!url || !anonKey) return null;
  client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url, anonKey, { auth: { persistSession: false } }),
  );
  return client;
}
