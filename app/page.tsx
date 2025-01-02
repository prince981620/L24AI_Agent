"use client";

import LexiconButton from "./components/LexiconButton";
import ChatComponent from "./components/LexiconPopup";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <div className="relative text-center space-y-8 pt-16 lg:pt-24 mb-12 px-4">
        <div className="flex justify-center animate-fade-in">
          <img
            src="/lexicon/lexicon-logo.png"
            alt="Lexicon"
            className="h-20 w-auto hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="space-y-6 animate-fade-in-up">
          <h1 className="text-5xl lg:text-7xl font-bold text-black">
            Welcome to{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-black to-gray-600">
              Lexicon
            </span>
          </h1>
          <p className="text-gray-600 max-w-xl mx-auto text-lg lg:text-xl font-light">
            Experience the future of blockchain interaction with our AI-powered
            Solana assistant
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-12">
        <LexiconButton />
      </div>
    </main>
  );
}
