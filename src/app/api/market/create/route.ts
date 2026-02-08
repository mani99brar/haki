import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type CreateOptionsBody = {
  wallet: string;
  marketLabel: string;
  marketDescription: string;
  options: string; // ordered labels
  b: number;
  resolution_type: string;
};

export async function POST(req: NextRequest) {
  const {
    wallet,
    marketLabel,
    marketDescription,
    options,
    b,
    resolution_type,
  }: CreateOptionsBody = await req.json();
  if (!wallet || !marketLabel) {
    console.log("Missing required fields", { wallet, marketLabel });
    return NextResponse.json(
      { error: "wallet and marketLabel required" },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("markets")
    .insert({
      creator_wallet: wallet,
      question: marketLabel,
      description: marketDescription,
      status: "open",
      b: b,
      resolution_type: resolution_type,
    })
    .select()
    .single();

  if (error) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const optionsArray = options.split(",").map((opt) => opt.trim());
  const optionRows = optionsArray.map((label, index) => ({
    market_id: data.id,
    label,
    index,
  }));
  console.log("Adding options", optionsArray);
  // --- Insert options ---
  const { data: createdOptions, error: optionsError } = await supabase
    .from("options")
    .insert(optionRows)
    .select();

  console.log(createdOptions, optionsError);
  if (optionsError) {
    return NextResponse.json({ error: optionsError.message }, { status: 500 });
  }
  console.log("Creating AMM");
  // --- Initialize AMM state (shares = 0 for each option) ---
  const ammRows = createdOptions.map((opt) => ({
    market_id: data.id,
    option_id: opt.id,
    shares: 0,
  }));
  const { data: ammData, error: ammError } = await supabase
    .from("amm_state")
    .insert(ammRows)
    .select();

  console.log(ammData, ammError);
  if (ammError) {
    return NextResponse.json({ error: ammError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    market: data,
    options: createdOptions,
  });
}
