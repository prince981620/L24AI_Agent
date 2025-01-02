"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

const WalletConnectButton: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <WalletMultiButton className="wallet-adapter-button-trigger !bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a] hover:from-[#2a2a2a] hover:to-[#222222] !text-white/90 !border !border-gray-800/50 !rounded-xl !py-2.5 !px-4 !h-auto !text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg" />
    </div>
  );
};

export default WalletConnectButton;
