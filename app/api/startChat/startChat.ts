import { OpenAI } from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { Message } from "../../types/types";
import { ChatConfig } from "../../types/types";

const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.NEXT_PUBLIC_AI_MODEL as string;

export const startChat = async (messages: Message[], config: ChatConfig) => {
  const openai = new OpenAI({
    apiKey,
  });

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: config.systemPrompt,
        },
        ...(messages as ChatCompletionMessageParam[]),
      ],
      temperature: 0.3,
      tools: config.tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      return {
        functionCall: {
          name: message.tool_calls[0].function.name,
          arguments: JSON.parse(message.tool_calls[0].function.arguments),
        },
        content: message.content,
      };
    }

    return {
      content: message.content,
      functionCall: null,
    };
  } catch (error) {
    console.error("Error while chatting with GPT:", error);
    throw new Error("Unable to fetch chat response.");
  }
};
