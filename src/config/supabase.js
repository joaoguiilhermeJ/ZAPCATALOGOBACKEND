// Cliente Supabase singleton — uso exclusivo do backend.
import "dotenv/config";
import ws from "ws";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY?.trim();
const missingVariables = [
  !supabaseUrl && "SUPABASE_URL",
  !supabaseServiceKey && "SUPABASE_SERVICE_KEY",
].filter(Boolean);

function initializeSupabase() {
  if (missingVariables.length) {
    console.warn(
      `[Supabase] Configuração incompleta: ${missingVariables.join(", ")}. Uploads de imagens ficarão desabilitados.`,
    );
    return null;
  }

  if (!globalThis.WebSocket) globalThis.WebSocket = ws;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const supabase = initializeSupabase();

export function getSupabaseClient() {
  return supabase;
}

export default supabase;
