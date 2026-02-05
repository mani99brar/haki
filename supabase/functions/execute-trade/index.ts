import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.json();
  const {
    wallet,
    market_id,
    option_id,
    shares_delta,
    signed_payload,
    signature
  } = body;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("execute_trade", {
    p_wallet: wallet,
    p_market: market_id,
    p_option: option_id,
    p_shares_delta: shares_delta,
    p_signed_payload: signed_payload,
    p_signature: signature
  });

  if (error) {
    console.error(error);
    return new Response(JSON.stringify(error), { status: 400 });
  }

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
});
