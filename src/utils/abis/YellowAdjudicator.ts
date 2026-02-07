
export const ADJUDICATOR_ABI = [
  {
    name: "openChannel",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "channel",
        type: "tuple",
        components: [
          { name: "participants", type: "address[]" },
          { name: "adjudicator", type: "address" },
          { name: "challenge", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
      },
      {
        name: "state",
        type: "tuple",
        components: [
          { name: "intent", type: "uint256" },
          { name: "version", type: "uint256" },
          { name: "state_data", type: "bytes" },
          {
            name: "allocations",
            type: "tuple[]",
            components: [
              { name: "asset", type: "address" },
              { name: "destination", type: "address" },
              { name: "amount", type: "uint256" },
            ],
          },
        ],
      },
      { name: "signatures", type: "bytes[]" },
    ],
  },
] as const;
