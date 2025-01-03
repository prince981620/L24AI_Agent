export const tools = [
  {
    name: "sell_L24AI",
    description: "sell L24AI to get solana(SOL) using Radium Pool on Solana.",
    strict: true,
    parameters: {
      type: "object",
      required: [ "amount"],
      properties: {
        amount: {
          type: "number",
          description:
            "The amount of input tokens in human-readable form (e.g., 1000 L24AI, not in decimals)",
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "buy_L24AI",
    description: "buy L24AI spending solana(SOL) using Radium Pool on Solana.",
    strict: true,
    parameters: {
      type: "object",
      required: [ "amount"],
      properties: {
        amount: {
          type: "number",
          description:
            "The amount of input tokens in human-readable form (e.g., 0.5 SOL, not in lamports)",
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_portfolio_balance",
    description: "Gets the portfolio balance and assets for a wallet address.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        walletAddress: {
          type: "string",
          description: "The Solana wallet address to check the portfolio for if user doesn't provide a wallet address, it will use the connected wallet",
        },
        includeNfts: {
          type: "boolean",
          description: "Whether to include NFTs in the portfolio analysis",
          default: true
        }
      },
      additionalProperties: false,
    },
  },
];
