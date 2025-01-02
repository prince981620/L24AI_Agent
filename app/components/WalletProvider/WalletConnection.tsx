"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import React, { useState, useEffect } from "react";

export default function WalletConnection() {
  const { connected, publicKey } = useWallet();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (connected) {
      console.log("Connected to wallet:", publicKey?.toBase58());
    }
  }, [connected, publicKey]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-black/10 to-gray-900/10 backdrop-blur-sm border border-gray-200/20">
      <WalletMultiButton className="wallet-adapter-button-trigger !bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a] hover:from-[#2a2a2a] hover:to-[#222222] !text-white/90 !border !border-gray-800/50 !rounded-xl !py-2.5 !px-4 !h-auto !text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" />
      {connected && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="font-mono">
            {publicKey?.toBase58().slice(0, 4)}...
            {publicKey?.toBase58().slice(-4)}
          </p>
        </div>
      )}
    </div>
  );
}
