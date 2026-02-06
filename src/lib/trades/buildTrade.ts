export function getTradeCost(
  oldCost: number,
  newCost: number
) {
  return Number((newCost - oldCost).toFixed(6))
}

export function getImpliedPrice(
  outcomeShares: number,
  totalShares: number
) {
  return Number((outcomeShares / totalShares).toFixed(6))
}

export function buildTradeInsertPayload({
  walletAddress,
  marketId,
  optionId,
  sharesDelta,
  cost,
  priceAtTrade,
  signedPayload,
  signature,
}: {
  walletAddress: string
  marketId: string
  optionId: string
  sharesDelta: number
  cost: number
  priceAtTrade: number
  signedPayload: Record<string, any>
  signature: string
}) {
  return {
    wallet_address: walletAddress.toLowerCase(),
    market_id: marketId,
    option_id: optionId,
    shares_delta: sharesDelta,
    cost,
    price_at_trade: priceAtTrade,
    signed_payload: signedPayload,
    signature,
  }
}
