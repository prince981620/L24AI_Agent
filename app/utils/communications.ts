import { ChatResponse, Message, FunctionCall } from "../types/types";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { ChatConfig } from "../types/types";

// Message history management
let messageHistory: Message[] = [];

export const clearMessageHistory = () => {
  messageHistory = [];
};

export const getMessageHistory = () => {
  return [...messageHistory];
};

// Function execution
export const executeFunctionCall = async (
  functionCall: FunctionCall,
  wallet: WalletContextState,
  config: ChatConfig,
  rpcUrl?: string
): Promise<string | null> => {
  const handler = config.functionHandlers[functionCall.name];

  if (!handler) {
    console.error(`No handler found for function: ${functionCall.name}`);
    return `Function '${functionCall.name}' is not implemented`;
  }

  try {
    return await handler(functionCall.arguments, wallet, rpcUrl);
  } catch (error) {
    console.error(`Error executing function ${functionCall.name}:`, error);
    return `Error executing function ${functionCall.name}`;
  }
};

// Message sending and processing
export const sendMessageLexicon = async (
  userInput: string,
  config: ChatConfig
): Promise<ChatResponse> => {
  messageHistory.push({ role: "user", content: userInput });

  try {
    const response = await fetch("/api/startChat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userInput,
        messageHistory,
        config,
      }),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    if (data.response.content) {
      messageHistory.push({
        role: "assistant",
        content: data.response.content,
      });
    }

    if (data.response.functionCall) {
      messageHistory.push({
        role: "assistant",
        content: `Function Called: ${
          data.response.functionCall.name
        }\nArguments: ${JSON.stringify(
          data.response.functionCall.arguments,
          null,
          2
        )}`,
      });
    }

    return data.response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw new Error("Failed to send message");
  }
};
