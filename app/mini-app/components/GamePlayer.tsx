"use client";

import { useState, useEffect } from "react";
import { PaymentButton } from "./PaymentButton";
import { type WriterCoin } from "@/lib/writerCoins";

interface GamePlayerProps {
  game: any;
  onBack: () => void;
  writerCoin?: WriterCoin;
}

export function GamePlayer({ game, onBack, writerCoin }: GamePlayerProps) {
  const [gameContent, setGameContent] = useState<string>("");
  const [options, setOptions] = useState<Array<{ id: number; text: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 11));
  const [gameHistory, setGameHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Start the game
  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/${game.slug}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!response.ok) throw new Error("Failed to start game");

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";
        let currentContent = "";
        let currentOptions: typeof options = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "content") {
                  currentContent += data.content;
                  setGameContent(currentContent);
                } else if (data.type === "options") {
                  currentOptions = data.options;
                  setOptions(currentOptions);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }

        setGameHistory([{ role: "assistant", content: currentContent }]);
      } catch (error) {
        console.error("Error starting game:", error);
        setGameContent("Failed to start game. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    startGame();
  }, [game.slug, sessionId]);

  const handleMintSuccess = async () => {
    setShowMintDialog(false);
    setIsMinting(false);
    // Game minted! Could show success message here
  };

  const handleChoice = async (option: { id: number; text: string }) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Add user choice to history
      const newHistory = [
        ...gameHistory,
        { role: "user" as const, content: option.text },
      ];
      setGameHistory(newHistory);

      const response = await fetch("/api/games/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: gameHistory,
          userInput: option.text,
          sessionId,
          gameSlug: game.slug,
          model: game.promptModel || "gpt-4o-mini",
        }),
      });

      if (!response.ok) throw new Error("Failed to continue game");

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let currentContent = "";
      let currentOptions: typeof options = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "content") {
                currentContent += data.content;
                setGameContent((prev) => prev + data.content);
              } else if (data.type === "options") {
                currentOptions = data.options;
                setOptions(currentOptions);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      setGameHistory([
        ...newHistory,
        { role: "assistant", content: currentContent },
      ]);
      setGameContent((prev) => prev + "\n\n" + currentContent);
    } catch (error) {
      console.error("Error continuing game:", error);
      setGameContent(
        (prev) => prev + "\n\nFailed to continue game. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{game.title}</h2>
          <p className="text-sm text-purple-300">
            {game.genre} • {game.subgenre}
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-purple-300 hover:text-purple-200"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Game Description and Metadata */}
      <div className="rounded-lg bg-purple-900/30 p-4 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Game Description
          </h3>
          <p className="text-sm text-purple-200">{game.description}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Article Metadata
          </h3>
          <ul className="space-y-2 text-sm text-purple-200">
            <li>
              <span className="font-medium text-purple-100">Publication:</span>{" "}
              {game.publicationName || "Unknown"}
              {game.publicationSummary && (
                <p className="text-xs text-purple-300 mt-1">
                  {game.publicationSummary}
                </p>
              )}
            </li>
            <li>
              <span className="font-medium text-purple-100">Subscribers:</span>{" "}
              {game.subscriberCount?.toLocaleString() || "0"}
            </li>
            <li>
              <span className="font-medium text-purple-100">Author:</span>{" "}
              {game.author || "Unknown"} (Wallet: {game.authorWallet || "N/A"})
            </li>
            <li>
              <span className="font-medium text-purple-100">Published:</span>{" "}
              {game.articlePublishedAt
                ? new Date(game.articlePublishedAt).toLocaleDateString()
                : "Unknown"}
            </li>
          </ul>
        </div>
      </div>

      {/* Game Content */}
      <div className="rounded-lg bg-purple-950/50 border border-purple-700/50 p-6">
        <div className="space-y-4">
          <div className="prose prose-invert max-w-none text-purple-50">
            <p className="whitespace-pre-wrap leading-relaxed">{gameContent}</p>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
            </div>
          )}

          {/* Game Options */}
          {options.length > 0 && !isLoading && (
            <div className="space-y-2 pt-4">
              <p className="text-xs uppercase tracking-wider text-purple-400">
                Choose your action:
              </p>
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleChoice(option)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-purple-500/50 bg-purple-900/30 px-4 py-3 text-left text-sm text-purple-200 transition-all hover:border-purple-400 hover:bg-purple-900/50 disabled:opacity-50"
                >
                  <span className="font-medium">{option.id}.</span>{" "}
                  {option.text}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 rounded-lg border border-purple-500/50 px-4 py-3 font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-white/5"
        >
          Exit Game
        </button>
        <button
          onClick={() => setShowMintDialog(true)}
          disabled={isMinting}
          className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mint as NFT
        </button>
      </div>

      {/* Mint Dialog */}
      {showMintDialog && writerCoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-lg bg-purple-900/95 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">
              Mint Game as NFT
            </h3>
            <p className="mb-6 text-purple-200">
              Mint this game as an NFT on Base to prove ownership and share it
              on Farcaster.
            </p>

            <div className="mb-6 rounded-lg bg-purple-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-purple-300">Mint Cost:</span>
                <span className="font-semibold text-white">
                  {(
                    Number(writerCoin.mintCost) /
                    10 ** writerCoin.decimals
                  ).toFixed(0)}{" "}
                  {writerCoin.symbol}
                </span>
              </div>
            </div>

            <div className="mb-6">
              <PaymentButton
                writerCoin={writerCoin}
                action="mint-nft"
                onPaymentSuccess={handleMintSuccess}
                onPaymentError={() => setShowMintDialog(false)}
                disabled={isMinting}
              />
            </div>

            <button
              onClick={() => setShowMintDialog(false)}
              disabled={isMinting}
              className="w-full rounded-lg border border-purple-500/50 px-4 py-2 font-medium text-purple-300 transition-colors hover:border-purple-400 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg bg-purple-900/30 p-4">
        <p className="text-xs text-purple-300">
          💡 <span className="font-semibold">Tip:</span> Your choices shape the
          story. Explore different paths to uncover all the game has to offer.
        </p>
      </div>
    </div>
  );
}
