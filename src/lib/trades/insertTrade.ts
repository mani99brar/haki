import { supabase } from "@/lib/supabase"
import { buildTradeInsertPayload } from "./buildTrade"

export async function insertTrade(
  input: Parameters<typeof buildTradeInsertPayload>[0]
) {
  const payload = buildTradeInsertPayload(input)

  const { data, error } = await supabase
    .from("trades")
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// <button
//   onClick={async () => {
//     const trade = await insertTrade({
//       walletAddress: "0xtest",
//       marketId: "00000000-0000-0000-0000-000000000001",
//       optionId: "11111111-1111-1111-1111-111111111111",
//       sharesDelta: 1,
//       cost: 0.01,
//       priceAtTrade: 0.55,
//       signedPayload: {
//         marketId: "00000000-0000-0000-0000-000000000001",
//         optionId: "11111111-1111-1111-1111-111111111111",
//         shares: 1,
//         price: 0.55,
//       },
//       signature: "test-signature",
//     })

//     console.log("Trade inserted ✅", trade)
//   }}
// >
//   Test Trade Insert
// </button>
