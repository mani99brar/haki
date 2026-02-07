"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import "./create.css";
import { useHakiContract } from "@/hooks/useHakiContract";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  text: string;
}

// Resolution Strategy Types
export type ResolutionStrategy = "creator" | "max_votes" | "oracle";

export default function CreatePage() {
  const router = useRouter(); // Initialize router
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [expiry, setExpiry] = useState("");
  const [liquidityB, setLiquidityB] = useState("100"); // Default 'b' value
  const [resolutionStrategy, setResolutionStrategy] =
    useState<ResolutionStrategy>("oracle");
  const [options, setOptions] = useState<Option[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [showPreview, setShowPreview] = useState(true);
  const { createMarket, isLoading, isSuccess } = useHakiContract();

  useEffect(() => {
    if (isSuccess && label) {
      // Small timeout can help ensure the DB sync starts before navigation
      const timer = setTimeout(() => {
        router.push(`/market/${label}`);
      }, 1500); // 1.5s delay to show a success state or allow DB sync

      return () => clearTimeout(timer);
    }
  }, [isSuccess, label, router]);

  // ... (addOption, removeOption, updateOption logic remains the same)
  const addOption = () => {
    if (options.length < 6) {
      setOptions([
        ...options,
        {
          id: (Number(options[options.length - 1].id) + 1).toString(),
          text: "",
        },
      ]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) setOptions(options.filter((o) => o.id !== id));
  };

  const updateOption = (id: string, value: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text: value } : o)));
  };

  const handleSubmit = async () => {
    if (
      !label ||
      !description ||
      options.filter((o) => o.text.trim()).length < 2 ||
      !expiry
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const formattedOptions = options
      .map((opt) => opt.text.trim())
      .filter((text) => text !== "")
      .join(",");

    const epochTimestamp = Math.floor(new Date(expiry).getTime() / 1000);

    try {
      // Passing the new 'b' and strategy to your contract hook
      createMarket(
        label,
        description,
        formattedOptions,
        epochTimestamp,
        Number(liquidityB),
        resolutionStrategy,
      );

      const response = await fetch("/api/market/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          {
            wallet: "0xtest",
            label,
            description,
            options: formattedOptions,
            b: liquidityB, // This is a BigInt
            resolution_type: resolutionStrategy,
          },
          (key, value) =>
            // This 'replacer' function handles the BigInt conversion
            typeof value === "bigint" ? value.toString() : value,
        ),
      });
    } catch (error) {
      console.error("Failed to create market:", error);
    }
  };

  return (
    <>
      <Navigation />
      <div className="create-container">
        <div className="form-panel">
          <div className="form-header">
            <h1 className="form-title">Create Market</h1>
            <p className="form-subtitle">
              Deploy a new prediction market on-chain
            </p>
          </div>

          <div className="form-content">
            {/* ... Market Label and Description inputs (keep as is) ... */}
            <div className="form-group">
              <label className="form-label">
                Market Label{" "}
                <span className="label-badge required">Required</span>
              </label>
              <div className="label-input-wrapper">
                <input
                  type="text"
                  className="form-input label-input"
                  placeholder="bitcoin-2026"
                  value={label}
                  onChange={(e) =>
                    setLabel(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    )
                  }
                  maxLength={32}
                />
                <div className="label-suffix">.haki-pm.eth</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Market Description{" "}
                <span className="label-badge required">Required</span>
              </label>
              <textarea
                className="form-textarea"
                placeholder="Describe the market conditions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {/* NEW: Liquidity Parameter (b) */}
            <div className="form-group">
              <label className="form-label">
                Liquidity Depth (b)
                <span className="label-badge">LMSR Parameter</span>
              </label>
              <input
                type="number"
                className="form-input"
                value={liquidityB}
                onChange={(e) => setLiquidityB(e.target.value)}
                min="1"
              />
              <p className="form-hint">
                Higher values mean lower price volatility (requires more initial
                liquidity).
              </p>
            </div>

            {/* NEW: Resolution Strategy */}
            <div className="form-group">
              <label className="form-label">Resolution Strategy</label>
              <div
                className="strategy-grid"
                style={{
                  display: "grid",
                  gap: "10px",
                  gridTemplateColumns: "1fr",
                }}
              >
                <button
                  className={`strategy-opt ${resolutionStrategy === "oracle" ? "active" : ""}`}
                  onClick={() => setResolutionStrategy("oracle")}
                  type="button"
                >
                  <strong>🛡️ Haki Protocol</strong>
                  <span>Resolved by Haki DAO/Admin</span>
                </button>
                <button
                  className={`strategy-opt ${resolutionStrategy === "creator" ? "active" : ""}`}
                  onClick={() => setResolutionStrategy("creator")}
                  type="button"
                >
                  <strong>👤 User Proposed</strong>
                  <span>Creator proposes, community disputes</span>
                </button>
                <button
                  className={`strategy-opt ${resolutionStrategy === "max_votes" ? "active" : ""}`}
                  onClick={() => setResolutionStrategy("max_votes")}
                  type="button"
                >
                  <strong>🤖 Auto-Resolve</strong>
                  <span>Settles to the highest probability at expiry</span>
                </button>
              </div>
            </div>

            {/* ... Options and Expiry (keep as is) ... */}
            <div className="form-group">
              <label className="form-label">Market Options</label>
              <div className="options-list">
                {options.map((option, index) => (
                  <div key={option.id} className="option-builder">
                    <div className="option-number">{index + 1}</div>
                    <input
                      type="text"
                      className="option-input"
                      value={option.text}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                    />
                    {options.length > 2 && (
                      <button
                        className="remove-option-btn"
                        onClick={() => removeOption(option.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button className="add-option-btn" onClick={addOption}>
                    + Add option
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Market Expiry</label>
              <input
                type="datetime-local"
                className="form-input"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>

            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "Deploying..." : "→ Deploy Market"}
            </button>
          </div>
        </div>

        {/* Preview Panel (Keep existing logic) */}
        {/* ... */}
      </div>
    </>
  );
}
