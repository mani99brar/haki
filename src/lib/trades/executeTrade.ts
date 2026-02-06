import { supabase } from "@/lib/supabase"

export type TradeIntent = {
  walletAddress: string
  marketId: string
  optionId: string
  sharesDelta: number
  signedPayload: Record<string, any>
  signature: string
}

export async function executeTrade(intent: TradeIntent) {
  const { data, error } = await supabase.rpc("execute_trade", {
    p_wallet_address: intent.walletAddress.toLowerCase(),
    p_market_id: intent.marketId,
    p_option_id: intent.optionId,
    p_shares_delta: intent.sharesDelta,
    p_signed_payload: intent.signedPayload,
    p_signature: intent.signature,
  })

  if (error) throw error
  return data
}
