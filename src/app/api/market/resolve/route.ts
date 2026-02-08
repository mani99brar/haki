import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { predictProbabilities } from "@/utils/ai";
import { createWalletClient, Hex, http, namehash, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HAKI_ADDRESS } from "@/utils/consts";
import { HAKI_ABI } from "@/utils/abis/Haki";
import { sepolia } from "viem/chains";

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export async function POST(req: NextRequest) {
  try {
    const { marketId, marketLabel } = await req.json();

    if (!marketId) {
      return NextResponse.json({ error: "marketId required" }, { status: 400 });
    }

    // --------------------------------------------------
    // 1️⃣ Fetch market
    // --------------------------------------------------
    const { data: market, error: marketError } = await supabase
      .from("markets")
      .select("id, question, status, resolution_type")
      .eq("id", marketId)
      .single();

    if (marketError || !market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    // if (market.status !== "open") {
    //   return NextResponse.json(
    //     { error: "Market is not open" },
    //     { status: 409 },
    //   );
    // }
      let winningLabel = "";
      let justification = "";
      if (market.resolution_type !== "oracle") {
        const { data: options, error: optionsError } = await supabase.rpc(
          "get_market_options",
          { p_market: marketId },
        );
        if (optionsError || !options || options.length < 2) {
          return NextResponse.json(
            { error: "Failed to fetch market prices" },
            { status: 500 },
          );
        }
        const sorted = [...options].sort(
          (a: any, b: any) =>
            b.marginal_price - a.marginal_price ||
            a.option_id.localeCompare(b.option_id),
        );

        const winning = sorted[0];
        winningLabel = winning.label;
        justification =
          "Resolved by LMSR oracle. Winner has highest marginal price.";
      } else {
        // --------------------------------------------------
        // 2️⃣ Fetch options
        // --------------------------------------------------
        const { data: options, error: optionsError } = await supabase
          .from("options")
          .select("id, label")
          .eq("market_id", marketId);

        if (optionsError || !options || options.length < 2) {
          return NextResponse.json(
            { error: "Invalid market options" },
            { status: 400 },
          );
        }

        const labels = options.map((o) => o.label);

        // --------------------------------------------------
        // 3️⃣ Call oracle (pure function)
        // --------------------------------------------------
        const probabilities = await predictProbabilities(
          market.question,
          labels,
        );
        // --------------------------------------------------
        // 4️⃣ Deterministically select winner
        // --------------------------------------------------
        const sorted = Object.entries(probabilities).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        );

        const [aiWinningLabel, winningProb] = sorted[0];

        const winningOption = options.find((o) => o.label === aiWinningLabel);

        if (!winningOption) {
          throw new Error("Oracle returned unknown option label");
        }
        winningLabel = winningOption.label;
        justification = stringToHex(
          `Resolved by AI Oracle. Winner: ${winningLabel} with ${(winningProb * 100).toFixed(1)}% confidence.`,
        );
      }

      const apiUrl = `${getBaseUrl()}/api/merkleroot`;

      const merkleResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marketId: marketId,
          optionLabel: winningLabel, // Passing the label we just determined
        }),
      });
      const data = await merkleResponse.json();
      if (!merkleResponse.ok)
        throw new Error(data.error || "Failed to generate state root");
      const stateRoot = data.merkleRoot as Hex;

      const account = privateKeyToAccount(
        process.env.HAKI_VAULT_PRIVATE_KEY! as `0x${string}`,
      );

      const client = createWalletClient({
        account,
        chain: sepolia,
        transport: http(), // or default http()
      });

      // Calculate ENS Node: namehash("label.haki-pm.eth")
      const node = namehash(`${marketLabel}.haki-pm.eth`);

    console.log(`Submitting result for node: ${node}`);
    console.log(`Winner: ${winningLabel}, Root: ${stateRoot}`);
    const finalJustification = stringToHex(justification);
    const txHash = await client.writeContract({
      address: HAKI_ADDRESS,
      abi: HAKI_ABI,
      functionName: "submitMarketResult",
      args: [
        node, // bytes32 node
        winningLabel, // string calldata option
        stateRoot, // bytes32 stateRoot
        finalJustification, // bytes calldata justification
      ],
    });

    console.log("Transaction sent:", txHash);

    // --------------------------------------------------
    // 7️⃣ Response
    // --------------------------------------------------
    return NextResponse.json({
      marketId,
      resolutionType: "oracle",
      winningOptionLabel: winningLabel,
      stateRoot,
    });
  } catch (err: any) {
    console.error("Oracle market resolution failed:", err);
    return NextResponse.json(
      { error: err.message ?? "Oracle resolution failed" },
      { status: 500 },
    );
  }
}
