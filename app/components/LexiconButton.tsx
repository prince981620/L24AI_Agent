"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { ChatComponentProps } from "../types/types";

const LexiconPopup = dynamic(() => import("./LexiconPopup"), { ssr: false });

interface LexiconButtonProps extends ChatComponentProps {
  buttonClassName?: string;
}

const LexiconButton: React.FC<LexiconButtonProps> = ({
  configId = "default",
  buttonClassName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleResize = useCallback(() => {
    if (window.parent !== window) {
      const size = isOpen ? { width: 380, height: 680 } : { width: 120, height: 32 };
      window.parent.postMessage({
        type: 'resize',
        ...size
      }, '*');
    }
  }, [isOpen]);

  useEffect(() => {
    handleResize();
    
    // Handle escape key to close popup
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleResize]);

  if (!mounted) return null;

  return (
    <div className="inline-flex bg-transparent">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`
            flex items-center justify-center gap-1.5 
            w-[120px] h-[32px] 
            bg-black hover:bg-gray-900
            border border-white/30 hover:border-white/50
            text-white
            rounded-lg
            transition-all duration-200
            shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-2 focus:ring-white/20
            ${buttonClassName}
          `}
          aria-label="Open chat with Lexicon AI"
        >
          <img
            src="/lexicon/lexicon-logo.png"
            alt=""
            className="h-4 w-4 rounded-full"
            aria-hidden="true"
          />
          <span className="text-xs font-medium">Chat with AI</span>
        </button>
      ) : (
        <LexiconPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          configId={configId}
        />
      )}
    </div>
  );
};

export default LexiconButton;
