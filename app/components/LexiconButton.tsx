"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useState, useEffect } from "react";

const WalletConnectButton: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [showWalletList, setShowWalletList] = useState(false);
  const { publicKey, disconnect, wallets, select } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleWalletList = () => setShowWalletList((prev) => !prev);

  // Function to truncate wallet address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  // If wallet is connected, show address and disconnect button
  if (publicKey) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-green-500/80 cursor-pointer" onClick={disconnect}
        >
          {formatAddress(publicKey.toBase58())}
        </span>
        {/* <button
          onClick={disconnect}
          className="wallet-adapter-button-trigger !bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a] hover:from-[#2a2a2a] hover:to-[#222222] !text-white/90 !border !border-gray-800/50 !rounded-xl !py-2.5 !px-4 !h-auto !text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
        >
          Disconnect
        </button> */}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={toggleWalletList}
        className="wallet-adapter-button-trigger !bg-gradient-to-r from-[#1e1e1e] to-[#1a1a1a] hover:from-[#2a2a2a] hover:to-[#222222] !text-white/90 !border !border-gray-800/50 !rounded-xl !py-2.5 !px-4 !h-auto !text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
      >
        Connect Wallet
      </button>
      
      {showWalletList && (
        <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a] rounded-xl border border-gray-800/50 p-4 min-w-[240px] shadow-xl">
          <WalletList 
            wallets={wallets} 
            select={select} 
            onClose={() => setShowWalletList(false)} 
          />
        </div>
      )}
    </div>
  );
};

interface WalletListProps {
  wallets: ReturnType<typeof useWallet>["wallets"];
  select: (walletName: string) => void;
  onClose: () => void;
}

function WalletList({ wallets, select, onClose }: WalletListProps) {
  const installedWallets = wallets.filter(
    (wallet) => wallet.readyState === "Installed"
  );

  const handleWalletSelect = (walletName: string) => {
    select(walletName);
    onClose();
  };

  return (
    <div className="space-y-2">
      {installedWallets.length === 0 ? (
        <div className="text-white/90 text-sm p-2">
          Please install a compatible Solana wallet to continue.
        </div>
      ) : (
        installedWallets
          .filter((wallet) => wallet.adapter.name !== "Phantom")
          .map((wallet) => (
            <div
              key={wallet.adapter.name}
              onClick={() => handleWalletSelect(wallet.adapter.name)}
              className="flex items-center gap-2 p-2 hover:bg-gray-800/50 rounded-lg cursor-pointer transition-colors"
            >
              {wallet.adapter.icon && (
                <img
                  src={wallet.adapter.icon}
                  alt={`${wallet.adapter.name} logo`}
                  className="w-6 h-6"
                />
              )}
              <span className="text-white/90">{wallet.adapter.name}</span>
            </div>
          ))
      )}
    </div>
  );
}

export default WalletConnectButton;