export const tools = [
  {
    name: "send_solana_transaction",
    description:
      "Creates a Solana transaction to send a specified amount of SOL to a recipient wallet.",
    strict: true,
    parameters: {
      type: "object",
      required: ["recipient_wallet", "amount_sol"],
      properties: {
        amount_sol: {
          type: "number",
          description: "The amount of SOL to send.",
        },
        recipient_wallet: {
          type: "string",
          description:
            "The recipient's Solana wallet address. guney means C43TUJNRzeo3cTQo7h9UYmqZwivUNp8tE1WTFdTLMmid",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "sell_L24AI",
    description: "Sells L24AI tokens for SOL with transaction confirmation and status tracking.",
    strict: true,
    parameters: {
      type: "object",
      required: ["amount"],
      properties: {
        amount: {
          type: "number",
          description: "The amount of L24AI tokens to sell",
        },
        slippageBps: {
          type: "number",
          description: "Slippage tolerance in basis points (1 = 0.01%)",
          default: 50
        }
      },
      additionalProperties: false,
    },
  },
  {
    name: "buy_L24AI",
    description: "Buys L24AI tokens with SOL including transaction confirmation and status tracking.",
    strict: true,
    parameters: {
      type: "object",
      required: ["amount"],
      properties: {
        amount: {
          type: "number",
          description: "The amount of SOL to spend",
        },
        slippageBps: {
          type: "number",
          description: "Slippage tolerance in basis points (1 = 0.01%)",
          default: 50
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
