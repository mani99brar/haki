import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type CreateOptionsBody = {
  marketId: string;
  options: string[]; // ordered labels
};

export async function POST(req: NextRequest) {
  try {
    const { marketId, options }: CreateOptionsBody = await req.json();

    // --- Validation ---
    if (!marketId) {
      return NextResponse.json(
        { error: "marketId is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
        { status: 400 },
      );
    }

    // --- Build option rows with explicit index ---
    const optionRows = options.map((label, index) => ({
      market_id: marketId,
      label,
      index,
    }));

    // --- Insert options ---
    const { data: createdOptions, error: optionsError } = await supabase
      .from("options")
      .insert(optionRows)
      .select();

    if (optionsError) {
      return NextResponse.json(
        { error: optionsError.message },
        { status: 500 },
      );
    }

    // --- Initialize AMM state (shares = 0 for each option) ---
    const ammRows = createdOptions.map((opt) => ({
      market_id: marketId,
      option_id: opt.id,
      shares: 0,
    }));

    const { error: ammError } = await supabase
      .from("amm_state")
      .insert(ammRows);

    if (ammError) {
      return NextResponse.json(
        { error: ammError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      options: createdOptions,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
