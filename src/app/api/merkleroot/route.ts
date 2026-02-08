import { NextRequest, NextResponse } from "next/server";
import { MerkleTree } from "merkletreejs";
import { keccak256, encodePacked, parseUnits } from "viem";
import { supabase } from "@/lib/supabase";

// Force Node.js runtime to handle MerkleTreejs and Buffer correctly
export const runtime = "nodejs";

function hashLeaf(
  wallet: string,
  optionLabel: string,
  shares: string,
  channelId: string,
) {
  const atomicShares = parseUnits(shares, 6);
  return keccak256(
    encodePacked(
      ["address", "string", "uint256", "string"],
      [wallet as `0x${string}`, optionLabel, atomicShares, channelId],
    ),
  );
}

// Ensure the function name is exactly "POST" in uppercase
export async function POST(req: NextRequest) {
  try {
    const { marketId, optionLabel } = await req.json();

    if (!marketId || !optionLabel) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    // Fetch winning option
    const { data: optionData, error: optionError } = await supabase
      .from("options")
      .select("id")
      .eq("market_id", marketId)
      .eq("label", optionLabel)
      .single();

    if (optionError || !optionData) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }


    // Fetch winners
    const { data: holders, error: rpcError } = await supabase.rpc(
      "get_option_holders_for_resolution",
      { p_market: marketId, p_option: optionData.id },
    );
    if (rpcError || !holders || holders.length === 0) {
      return NextResponse.json({ error: "No winners found" }, { status: 400 });
    }

    // Deterministic Sort
    holders.sort((a: any, b: any) =>
      `${a.channel_id}${a.wallet_address}`.localeCompare(
        `${b.channel_id}${b.wallet_address}`,
      ),
    );

    const leaves = holders.map((h: any) =>
      hashLeaf(
        h.wallet_address.toLowerCase(),
        optionLabel,
        h.shares.toString(),
        h.channel_id,
      ),
    );

    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();


    return NextResponse.json({ merkleRoot, winnersCount: holders.length });
  } catch (err: any) {
    console.error("❌ API CRASH:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
