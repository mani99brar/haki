
# ⚔️ Haki — Off-Chain Prediction Markets

### Trust-Minimized Resolution • High-Frequency Trading • Sovereign Identity
**A HackMoney 2026 Submission**

---

## 📖 Overview
**Haki** is a hybrid prediction market protocol designed to bridge the gap between centralized performance and decentralized security. By leveraging off-chain state channels for execution and optimistic on-chain finality for settlement, Haki offers a "trade-at-the-speed-of-thought" experience without sacrificing the censorship resistance of Ethereum.

### The Haki Formula:
* **Execute:** High-frequency, gasless trading via **Yellow Network**.
* **Identify:** Every market is a first-class citizen with its own **ENS** identity.
* **Resolve:** Optimistic resolution with **Kleros** as the ultimate decentralized supreme court.

---

## 🧠 The Core Architecture
Most prediction markets force a trade-off between speed, cost, and trust. Haki eliminates these bottlenecks by separating the concerns:

| Layer | Responsibility | Technology |
| :--- | :--- | :--- |
| **Execution** | Instant, off-chain orders & matching | Yellow Network (Nitrolite) |
| **Pricing** | Deterministic LMSR price discovery | Supabase + LMSR Engine |
| **Identity** | Human-readable, portable markets | ENS Subdomains |
| **Settlement** | On-chain fund custody & Merkle proofs | Haki Smart Contracts |
| **Arbitration** | Final truth-seeking & dispute resolution | Kleros |

---

## 🎯 Key Differentiators

### ⚡ Gasless High-Frequency Trading
Traders open a single state channel. Once inside, they can buy or sell shares thousands of times with zero gas fees, zero MEV exposure, and zero network congestion risk.

### 🛡️ Flexible Optimistic Resolution
Haki doesn't lock you into one oracle. Market creators choose the resolution strategy that fits their liquidity:
* **Haki Protocol:** Curated resolution for flagship markets.
* **Creator-Proposed:** Social-consensus resolution (Optimistic).
* **Auto-Resolve:** Mathematical resolution based on final LMSR probabilities.

### ⚖️ Disputes as a Safety Net
Resolution is assumed correct by default to save costs. However, a challenge window allows anyone to post a bond and escalate to **Kleros**. If the resolver is found to be dishonest, they are slashed, and the challenger is rewarded.

### 🌐 Markets with Names, Not Hex
Every market is issued a unique ENS subdomain (e.g., `hackmoney-2026.haki-pm.eth`). This makes markets:
* **Discoverable:** Search for "2026-election" instead of `0x71C...`
* **Composable:** Any ENS-aware dApp can integrate and display Haki market data.
* **Verifiable:** The ENS record links directly to the market parameters.
---
## 🔄 Market Lifecycle & Flow
``` mermaid
sequenceDiagram
    autonumber
    participant Trader
    participant Creator
    participant UI as Haki dApp
    participant Yellow as Yellow Network
    participant Backend as Haki Backend
    participant Market as Haki Contract
    participant Kleros as Kleros Court

    Note over Creator,Market: 1. Creation & ENS Minting
    Creator->>Market: deployMarket(params)
    Market->>Market: Claim ENS (.haki-pm.eth)
    
    Note over Trader,Yellow: 2. Off-Chain Trading
    Trader->>Yellow: Open L3 Channel
    Trader->>UI: High-freq Buy/Sell
    UI->>Backend: Post Trade (LMSR Update)

    Note over Market,Kleros: 3. Resolution & Disputes
    Backend->>Market: Propose Outcome (Optimistic)
    
    alt Dispute Raised
        Trader->>Market: Challenge (Dispute Bond)
        Market->>Kleros: Escalation
        Kleros-->>Market: Final Ruling
    else No Dispute
        Market->>Market: Finalize after Window
    end

    Note over Trader,Market: 4. Settlement
    Trader->>Market: claimPayout(merkleProof)
    Market-->>Trader: Transfer Funds
```
## 🏗️ System Architecture

Haki is built as a modular stack, ensuring that the frontend, backend, and smart contracts maintain clear trust boundaries. The architecture ensures that while trading is lightning-fast and off-chain, the security of user funds remains anchored to Ethereum.
``` mermaid
graph TB
    subgraph UserLayer["👤 User Layer"]
        Trader["Trader / Creator"]
        Wallet["Wallet (EOA)"]
    end

    subgraph Frontend["🌐 Frontend Layer"]
        UI["Haki dApp"]
        YellowCtx["YellowProvider"]
        SupaClient["Supabase Client"]
    end

    subgraph Offchain["⚡ Off-chain Trading"]
        Yellow["Yellow Network"]
        API["Next.js APIs"]
        AMM["LMSR Engine"]
        Merkle["Merkle Builder"]
    end

    subgraph Database["🗄️ Data Layer"]
        Postgres["Supabase Postgres"]
    end

    subgraph Onchain["⛓️ On-chain"]
        HakiContract["Haki Core Contract"]
        ENS["ENS Registry"]
        Kleros["Kleros Court"]
    end

    Trader --> UI
    UI --> YellowCtx --> Yellow
    YellowCtx --> API --> AMM --> Postgres
    API --> HakiContract --> ENS
    HakiContract --> Kleros
    HakiContract --> Trader
  ```
 ---
##🧩 Resolution Strategies Explained

Haki provides a flexible resolution framework to accommodate different types of data sources and market sizes. Every market is an "optimistic" contract by default, assuming truth but allowing for verification.

-   **🛡️ Haki Protocol Resolution**: Used for high-importance or curated markets. The Haki backend proposes the outcome, backed by institutional or high-fidelity oracles. Still subject to the standard dispute window.
    
-   **👤 Creator-Proposed (Optimistic)**: The market creator proposes the outcome. This is ideal for social and niche markets where the creator is a trusted entity within a specific community.
    
-   **🤖 Auto-Resolve**: A purely quantitative approach that uses the final LMSR probabilities at the moment of expiry to settle the market. No human intervention is required, making it the most "set-and-forget" option.
    

> **Note:** Regardless of the strategy chosen, all resolutions are subject to the same challenge window. This ensures that the "Truth" is never behind a walled garden.

----------

## ⚖️ Why Kleros?

We chose **Kleros** as our arbitration engine because it represents the gold standard in decentralized justice.

-   **Neutrality**: Decentralized crowdsourced jurors ensure no single point of failure in truth-seeking.
    
-   **Economic Alignment**: Jurors are incentivized via the focal point game to vote with the majority (truth), while dishonest resolvers face immediate economic penalties.
    
-   **Efficiency**: By using an optimistic model, Kleros is only invoked when a challenge is raised, keeping costs low for 99% of markets.
    

----------

## 🌐 ENS as a First-Class Primitive

In Haki, a market is more than just a smart contract address. By issuing every market an **ENS subdomain**, we transform them into portable on-chain objects.

-   **Human-Readable**: Users can navigate to markets via names like `eth-price-2026.haki-pm.eth` instead of cryptic hex strings.
    
-   **Verified Identity**: The ENS record acts as a "seal of authenticity," linking the market's frontend representation directly to its on-chain parameters.
    
-   **Interoperability**: Any wallet or dApp that supports ENS can natively resolve and display Haki market status, making the protocol UI-agnostic.
    

----------

## 🏆 Why Haki Wins HackMoney

1.  **Scalability**: Solves the gas and latency issues of on-chain order books using **Yellow Network’s** L3 channels.
    
2.  **Trust-Minimized**: Combines the speed of a CEX with the ironclad dispute resolution of **Kleros**.
    
3.  **Composability**: Uses **ENS** to make prediction markets discoverable and easy to integrate across the wider Ethereum ecosystem.
    
4.  **Practicality**: Not just a whitepaper—Haki is a functional integration of state-of-the-art Web3 infrastructure.
    

----------

## 🚧 Status

-   **✅ Trading**: Off-chain execution via Yellow Network is fully functional.
    
-   **✅ AMM**: LMSR engine implemented with atomic SQL guarantees for deterministic pricing.
    
-   **✅ Settlement**: Merkle-based settlement logic completed.
    
-   **✅ Identity**: Automated ENS subdomain provisioning is live.
    
-   **✅ Justice**: Kleros dispute escalation bridge is integrated.
    

🚀 **Ready for mainnet iteration.**

----------

**Built for HackMoney 2026** _Powered by Yellow Network, Supabase, ENS, and Kleros._