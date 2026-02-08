import { NextRequest, NextResponse } from "next/server";
import { MerkleTree } from "merkletreejs";
import {keccak256} from "viem";
import { supabase } from "@/lib/supabase";

/**
 * Canonical Merkle leaf format (MUST match resolve):
 *
 * keccak256(
 * wallet_address |
 * option_label |
 * shares |
 * channel_id
 * )
 */
function hashLeaf(
  wallet: string,
  optionLabel: string,
  shares: string,
  channelId: string
) {
  return keccak256(
    Buffer.from(`${wallet}|${optionLabel}|${shares}|${channelId}`)
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const marketId = searchParams.get("marketId");
    const optionLabel = searchParams.get("optionLabel"); // Changed from winningOptionId
    const wallet = searchParams.get("wallet")?.toLowerCase();

    if (!marketId || !optionLabel || !wallet) {
      return NextResponse.json(
        { error: "marketId, optionLabel, wallet required" },
        { status: 400 }
      );
    }

    // 1️⃣ Resolve the Label to an ID to find the correct resolution record
    const { data: optionData, error: optionError } = await supabase
      .from("options")
      .select("id")
      .eq("market_id", marketId)
      .eq("label", optionLabel)
      .single();

    if (optionError || !optionData) {
      return NextResponse.json(
        { error: "Winning option label not found" },
        { status: 404 }
      );
    }

    const winningOptionId = optionData.id;

    // 2️⃣ Fetch resolution snapshot using the ID we just found
    const { data: resolution, error } = await supabase
      .from("resolutions")
      .select("merkle_root, snapshot")
      .eq("market_id", marketId)
      .eq("winning_option_id", winningOptionId)
      .single();

    if (error || !resolution) {
      return NextResponse.json(
        { error: "Market not resolved for this option" },
        { status: 400 }
      );
    }

    const { merkle_root, snapshot } = resolution;

    // 3️⃣ Deterministic ordering (MUST match resolve)
    const ordered = [...snapshot].sort((a: any, b: any) => {
      if (a.channel_id !== b.channel_id) {
        return a.channel_id.localeCompare(b.channel_id);
      }
      return a.wallet_address.toLowerCase().localeCompare(b.wallet_address.toLowerCase());
    });

    // 4️⃣ Build full leaf list using the LABEL
    const leaves = ordered.map((h: any) =>
      hashLeaf(
        h.wallet_address.toLowerCase(),
        optionLabel, // Hashing the label string
        h.shares.toString(),
        h.channel_id
      )
    );

    const tree = new MerkleTree(leaves, keccak256, {
      sortPairs: true,
    });

    // 5️⃣ Extract proofs for this wallet
    const proofs = ordered
      .map((h: any, idx: number) => {
        if (h.wallet_address.toLowerCase() !== wallet) return null;

        const leaf = leaves[idx];
        const proof = tree.getHexProof(leaf);

        return {
          channelId: h.channel_id,
          shares: h.shares.toString(),
          leaf: leaf, // `0x${leaf.toString()}`
          proof,
        };
      })
      .filter(Boolean);

    if (proofs.length === 0) {
      return NextResponse.json(
        { error: "No winning position for wallet" },
        { status: 404 }
      );
    }

    // 6️⃣ Return proofs
    return NextResponse.json({
      wallet,
      optionLabel,
      merkleRoot: merkle_root,
      proofs,
    });
  } catch (err: any) {
    console.error("Proof generation failed:", err);
    return NextResponse.json(
      { error: err.message ?? "Proof generation failed" },
      { status: 500 }
    );
  }
}