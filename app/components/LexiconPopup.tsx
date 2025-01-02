"use client";

import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import LoadingSpinner from "./LoadingSpinner";
import { ChatResponse, FrontendMessage } from "../types/types";
import ReactMarkdown from "react-markdown";
import WalletConnectButton from "./WalletProvider/WalletConnectButton";
import {
  sendMessageLexicon,
  executeFunctionCall,
} from "../utils/communications";
import { tools as defaultTools } from "@/configs/default/functionDefs";
import { systemPrompt as defaultSystemPrompt } from "@/configs/default/systemPrompt";
import { functionHandlers as defaultFunctionHandlers } from "@/configs/default/functions";
import { ChatConfig, ChatComponentProps } from "../types/types";

const LexiconPopup: React.FC<
  ChatComponentProps & {
    isOpen: boolean;
    onClose: () => void;
  }
> = ({ configId = "default", isOpen, onClose }) => {
  const wallet = useWallet();
  const [chatHistory, setChatHistory] = useState<FrontendMessage[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ChatConfig>({
    tools: defaultTools,
    systemPrompt: defaultSystemPrompt,
    functionHandlers: defaultFunctionHandlers,
  });
  const [rpcUrl, setRpcUrl] = useState<string>();

  useEffect(() => {
    const loadConfig = async () => {
      if (configId === "default") return;

      try {
        const [tools, systemPrompt, handlers] = await Promise.all([
          import(`../configs/${configId}/functionDefs`).then((m) => m.tools),
          import(`../configs/${configId}/systemPrompt`).then(
            (m) => m.systemPrompt
          ),
          import(`../configs/${configId}/functions`).then(
            (m) => m.functionHandlers
          ),
        ]);

        setConfig({
          tools,
          systemPrompt,
          functionHandlers: handlers,
        });
      } catch (error) {
        console.error(
          `Failed to load config for ${configId}, using default`,
          error
        );
      }
    };

    loadConfig();
  }, [configId]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isGenerating]);

  const startChat = async () => {
    if (userInput.trim() === "") return;

    const newMessage = { role: "user", content: userInput };
    setChatHistory([...chatHistory, newMessage]);
    setUserInput("");
    setIsGenerating(true);

    try {
      const response: ChatResponse = await sendMessageLexicon(
        userInput,
        config
      );

      if (response.content) {
        const gptMessage = { role: "assistant", content: response.content };
        setChatHistory((prev) => [...prev, gptMessage]);
      }

      if (response.functionCall) {
        const functionResult = await executeFunctionCall(
          response.functionCall,
          wallet,
          config,
          rpcUrl
        );
        const functionMessage = {
          role: "assistant",
          content:
            functionResult ||
            `Function Called: ${
              response.functionCall.name
            }\nArguments: ${JSON.stringify(
              response.functionCall.arguments,
              null,
              2
            )}`,
        };
        setChatHistory((prev) => [...prev, functionMessage]);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      const errorMessage = {
        role: "assistant",
        content: "Sorry, there was an error processing your request.",
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return isOpen ? (
    <div className="w-[380px] h-[680px] flex flex-col bg-gradient-to-b from-black to-[#0a0a0a] overflow-hidden border border-gray-800/50 shadow-2xl">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-black/90 border-b border-gray-800/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src="https://ipfs.io/ipfs/QmSSdSBDPYLXuBnMD9BNi4jr9WvEN6NCpgRnFYn79zRrRD"
              alt="Lexicon AI"
              className="h-7 w-7 rounded-full ring-2 ring-white/20"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-black"></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-wide">
              L24AI Agent
            </h2>
            <p className="text-[10px] text-gray-400">
              Online • Ready to assist
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <WalletConnectButton />
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto bg-[#0a0a0a] space-y-4 p-4 chat-scrollbar"
      >
        {/* Welcome Message - Now always visible */}
        <div className="flex items-start gap-3 animate-fade-in">
          <img
            src="https://ipfs.io/ipfs/QmSSdSBDPYLXuBnMD9BNi4jr9WvEN6NCpgRnFYn79zRrRD"
            alt="L24AI Agent"
            className="h-8 w-8 rounded-full ring-2 ring-white/20"
          />
          <div className="bg-gradient-to-br from-[#1e1e1e] to-[#1a1a1a] text-white/90 rounded-2xl rounded-tl-none px-5 py-4 max-w-[85%] shadow-xl">
            <p className="text-white font-medium">👋 Welcome to L24AI Agent</p>
            <p className="mt-2 text-white/70 text-sm leading-relaxed">
              I'm your specialized assistant for the Solana blockchain. Ask me
              anything about development, transactions, or exploring the
              ecosystem! You can also buy & sell L24AI tokens using Me!.
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === "user" ? "justify-end" : ""
            } animate-fade-in-up`}
          >
            {message.role === "assistant" && (
              <img
                src="https://ipfs.io/ipfs/QmSSdSBDPYLXuBnMD9BNi4jr9WvEN6NCpgRnFYn79zRrRD"
                alt="L24AI Agent"
                className="h-8 w-8 rounded-full ring-2 ring-white/20"
              />
            )}
            <div
              className={`relative max-w-[85%] shadow-lg overflow-hidden break-words ${
                message.role === "user"
                  ? "bg-gradient-to-r from-white/90 to-white/80 text-black rounded-2xl rounded-br-none"
                  : "bg-gradient-to-br from-[#1e1e1e] to-[#1a1a1a] text-white/90 rounded-2xl rounded-tl-none"
              } px-5 py-4 hover:shadow-xl transition-shadow duration-200`}
            >
              <ReactMarkdown
                className={`prose prose-sm max-w-none break-words ${
                  message.role === "user" ? "prose-black" : "prose-invert"
                }`}
                components={{
                  p: ({children}) => <p className="whitespace-pre-wrap">{children}</p>,
                  pre: ({children}) => <pre className="overflow-x-auto">{children}</pre>
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-start gap-3">
            <img
              src="https://ipfs.io/ipfs/QmSSdSBDPYLXuBnMD9BNi4jr9WvEN6NCpgRnFYn79zRrRD"
              alt="L24AI Agent"
              className="h-8 w-8 rounded-full ring-2 ring-white/20"
            />
            <div className="bg-gradient-to-br from-[#1e1e1e] to-[#1a1a1a] rounded-2xl rounded-tl-none px-5 py-4 shadow-xl">
              <LoadingSpinner />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 bg-black/90 border-t border-gray-800/50">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isGenerating && startChat()}
            disabled={isGenerating}
            className="flex-1 px-4 py-2 bg-[#1a1a1a] text-sm text-white rounded-xl border border-gray-800 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/10 placeholder-gray-500 transition-all duration-200"
            placeholder={
              isGenerating
                ? "L24AI Agent is thinking..."
                : "Ask anything about Solana..."
            }
          />
          <button
            onClick={startChat}
            disabled={isGenerating || !userInput.trim()}
            className="p-2 bg-white hover:bg-gray-100 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14m-7-7l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center">
          <a
            href="https://lexicon.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] hover:bg-[#222] border border-gray-800/50 transition-colors"
          >
            <span className="text-[10px] text-gray-500">
              AI Agent powered by
            </span>
            <div className="flex items-center gap-1.5">
              <img
                src="/lexicon/lexicon-logo-dark.png"
                alt="Lexicon"
                className="w-3 h-3 rounded-full"
              />
              <span className="text-[10px] font-medium text-white/90 hover:text-white transition-colors">
                Lexicon Labs
              </span>
            </div>
          </a>
        </div>
      </div>
    </div>
  ) : null;
};

export default LexiconPopup;
