"use client";

import { useState, useEffect, useRef, useId } from "react";
import { PaymentButton } from "./PaymentButton";
import { type WriterCoin } from "@/lib/writerCoins";
import type { Game } from "@/domains/games/types";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, cn } from "@/lib/utils";
import { composeCast } from "@/lib/farcaster";
import { Share2, ExternalLink, ShieldCheck, Trophy } from "lucide-react";

interface GamePlayerProps {
  game: Game;
  onBack: () => void;
  writerCoin?: WriterCoin;
  isMUSD?: boolean;
}

export function GamePlayer({ game, onBack, writerCoin, isMUSD }: GamePlayerProps) {
  const stableId = useId();
  const [gameContent, setGameContent] = useState<string>("");
  const [options, setOptions] = useState<Array<{ id: number; text: string }>>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => stableId.replace(/[:]/g, "").slice(0, 9));
  const [gameHistory, setGameHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [showMintDialog, setShowMintDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [mintResult, setMintResult] = useState<{
    txHash: string;
    storyIpId?: string;
  } | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

        setGameHistory([{ role: "assistant", content: currentContent }]);
        triggerHaptic('light');
      } catch (error) {
        console.error("Error starting game:", error);
        setGameContent("FATAL ERROR: Failed to initialize experience buffer.");
        triggerHaptic('error');
      } finally {
        setIsLoading(false);
      }
    };

    startGame();
  }, [game.slug, sessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameContent, options, isLoading]);

  const handleMintSuccess = async (transactionHash: string, storyIPAssetId?: string) => {
    triggerHaptic('success');
    setShowMintDialog(false);
    setIsMinting(false);
    setMintResult({ txHash: transactionHash, storyIpId: storyIPAssetId });
    setShowSuccessDialog(true);
    };

    const handleShare = async () => {
    triggerHaptic('medium');
    const success = await shareGame(game);
    if (!success) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/games/${game.slug}`);
      alert("Link copied to clipboard!");
    }
    };


  const handleChoice = async (option: { id: number; text: string }) => {
    if (isLoading) return;

    triggerHaptic('light');
    setIsLoading(true);
    try {
      const newHistory = [
        ...gameHistory,
        { role: "user" as const, content: option.text },
      ];
      setGameHistory(newHistory);
      setGameContent((prev) => prev + `\n\n> ${option.text}\n\n`);

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
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      setGameHistory([
        ...newHistory,
        { role: "assistant", content: currentContent },
      ]);
      triggerHaptic('light');
    } catch (error) {
      console.error("Error continuing game:", error);
      setGameContent(
        (prev) => prev + "\n\nSYSTEM ERROR: Connection interrupted."
      );
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HUD Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <div className="flex items-center space-x-2">
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest italic",
                  isMUSD ? "text-amber-500/60" : "text-purple-400/60"
                )}>Arena Active</span>
                <span className={cn(
                  "h-1 w-1 rounded-full animate-pulse",
                  isMUSD ? "bg-amber-500" : "bg-purple-500"
                )}></span>
            </div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{game.title}</h2>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-[0.2em]",
              isMUSD ? "text-amber-300/40" : "text-purple-300/40"
            )}>
                {game.genre} // {game.subgenre}
            </p>
        </div>
        <button
          onClick={() => { triggerHaptic('medium'); onBack(); }}
          className={cn(
            "group flex h-10 w-10 items-center justify-center rounded-xl border transition-all hover:border-red-500/50 hover:bg-red-500/10",
            isMUSD ? "border-amber-500/10 bg-amber-900/5" : "border-white/10 bg-white/5"
          )}
        >
          <svg className={cn("h-4 w-4 group-hover:text-red-400", isMUSD ? "text-amber-500" : "text-purple-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Terminal Display */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl border shadow-2xl transition-all duration-500",
        isMUSD ? "border-amber-500/20 bg-amber-950/20 shadow-amber-900/10" : "border-white/10 bg-black/40"
      )}>
        {/* Terminal Scanline Effect */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,128,0.03))] bg-[length:100%_4px,3px_100%]"></div>
        
        {/* Terminal Header */}
        <div className={cn(
          "flex items-center justify-between px-4 py-2 border-b",
          isMUSD ? "bg-amber-500/10 border-amber-500/10" : "bg-white/5 border-white/5"
        )}>
            <div className="flex space-x-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500/40"></div>
                <div className="h-2 w-2 rounded-full bg-yellow-500/40"></div>
                <div className="h-2 w-2 rounded-full bg-green-500/40"></div>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-white/20">Experience_Buffer_v1.0.4</span>
        </div>

        <div 
            ref={scrollRef}
            className="h-[400px] overflow-y-auto p-6 font-mono text-sm leading-relaxed scrollbar-hide"
        >
          <div className="prose prose-invert max-w-none prose-sm">
            <p className={cn(
              "whitespace-pre-wrap",
              isMUSD 
                ? "text-amber-100/90 [text-shadow:0_0_8px_rgba(245,158,11,0.4)]" 
                : "text-purple-100/90 [text-shadow:0_0_8px_rgba(168,85,247,0.4)]"
            )}>
                {gameContent}
                {isLoading && (
                    <span className={cn(
                      "inline-block h-4 w-2 animate-pulse ml-1 align-middle",
                      isMUSD ? "bg-amber-500" : "bg-purple-500"
                    )}></span>
                )}
            </p>
          </div>

          <AnimatePresence>
              {options.length > 0 && !isLoading && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 space-y-3"
                >
                  <div className="flex items-center space-x-2 py-2">
                    <span className="h-px flex-1 bg-white/5"></span>
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest italic",
                      isMUSD ? "text-amber-500/40" : "text-purple-400/40"
                    )}>System Input Required</span>
                    <span className="h-px flex-1 bg-white/5"></span>
                  </div>
                  {options.map((option, idx) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleChoice(option)}
                      disabled={isLoading}
                      className={cn(
                        "group flex w-full items-start space-x-3 rounded-xl border p-4 text-left transition-all active:scale-[0.98]",
                        isMUSD 
                          ? "border-amber-500/10 bg-amber-500/5 hover:border-amber-400/50 hover:bg-amber-500/10"
                          : "border-white/5 bg-white/5 hover:border-purple-500/50 hover:bg-purple-500/10"
                      )}
                    >
                      <span className={cn(
                        "text-[10px] font-black",
                        isMUSD ? "text-amber-500 group-hover:text-amber-400" : "text-purple-400 group-hover:text-purple-300"
                      )}>0{option.id}</span>
                      <span className="text-xs font-medium text-white/80 group-hover:text-white transition-colors">{option.text}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Footer */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => { triggerHaptic('medium'); onBack(); }}
          className={cn(
            "rounded-2xl border py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
            isMUSD 
              ? "border-amber-500/10 bg-amber-900/10 text-amber-500/60 hover:bg-amber-900/20 hover:text-amber-400"
              : "border-white/10 bg-white/5 text-purple-400/60 hover:bg-white/10 hover:text-purple-300"
          )}
        >
          Terminate
        </button>
        <button
          onClick={() => { triggerHaptic('heavy'); setShowMintDialog(true); }}
          disabled={isMinting}
          className={cn(
            "rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] italic transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg",
            isMUSD
              ? "bg-amber-500 text-black shadow-amber-500/20 hover:bg-amber-400"
              : "bg-green-500 text-black shadow-green-500/20 hover:bg-green-400"
          )}
        >
          Archive NFT
        </button>
      </div>

      {/* Success Dialog */}
      <AnimatePresence>
        {showSuccessDialog && mintResult && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a0a14]/95 backdrop-blur-3xl px-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    className="w-full max-w-sm overflow-hidden rounded-[32px] border border-green-500/30 bg-green-500/5 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
                >
                    <div className="relative p-8 text-center">
                        <div className="mb-6 flex justify-center">
                            <motion.div 
                                initial={{ rotate: -15, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", bounce: 0.5 }}
                                className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                            >
                                <Trophy className="h-10 w-10 text-black" />
                            </motion.div>
                        </div>

                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Experience Archived</h3>
                        <p className="mt-2 text-sm text-green-400/80 font-bold uppercase tracking-widest">Protocol Success</p>
                        
                        <div className="mt-8 space-y-3">
                            <button
                                onClick={handleShare}
                                className="group flex w-full items-center justify-center space-x-3 rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl"
                            >
                                <Share2 className="h-4 w-4" />
                                <span>Share to Feed</span>
                            </button>

                            <div className="grid grid-cols-2 gap-2">
                                <a
                                    href={`https://sepolia.basescan.org/tx/${mintResult.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors"
                                >
                                    <ShieldCheck className="h-4 w-4 text-purple-400 mb-1" />
                                    <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">BaseScan</span>
                                </a>
                                {mintResult.storyIpId && (
                                    <a
                                        href={`https://aeneid-testnet-explorer.story.foundation/ipa/${mintResult.storyIpId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center rounded-xl bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors"
                                    >
                                        <ExternalLink className="h-4 w-4 text-indigo-400 mb-1" />
                                        <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">IP Explorer</span>
                                    </a>
                                )}
                            </div>

                            <button
                                onClick={() => setShowSuccessDialog(false)}
                                className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-colors"
                            >
                                Return to Arena
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Mint Dialog */}
      <AnimatePresence>
        {showMintDialog && (writerCoin || isMUSD) && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0a0a14]/90 backdrop-blur-2xl px-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className={cn(
                      "w-full max-w-sm rounded-[32px] border p-1 shadow-2xl transition-all duration-500",
                      isMUSD ? "border-amber-500/20 bg-amber-950/20" : "border-white/10 bg-white/[0.03]"
                    )}
                >
                    <div className="rounded-[28px] bg-gradient-to-br from-white/[0.05] to-transparent p-8">
                        <div className="mb-6 text-center space-y-2">
                            <h3 className={cn(
                              "text-2xl font-black uppercase italic tracking-tighter",
                              isMUSD ? "text-amber-400" : "text-white"
                            )}>Permanence Protocol</h3>
                            <p className="text-xs text-white/40 font-medium">
                              Archive your experience on the {isMUSD ? 'Mezo' : 'Base'} network
                            </p>
                        </div>

                        <div className={cn(
                          "mb-8 rounded-2xl p-4 border",
                          isMUSD ? "bg-amber-500/5 border-amber-500/20" : "bg-purple-500/5 border-purple-500/10"
                        )}>
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest",
                                  isMUSD ? "text-amber-500/60" : "text-purple-400/60"
                                )}>Mint Cost</span>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-lg font-black text-white">
                                        {isMUSD ? '1' : (writerCoin ? (Number(writerCoin.mintCost) / 10 ** writerCoin.decimals).toFixed(0) : '0')}
                                    </span>
                                    <span className={cn(
                                      "text-[10px] font-black",
                                      isMUSD ? "text-amber-500" : "text-purple-400"
                                    )}>{isMUSD ? 'MUSD' : writerCoin?.symbol}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <PaymentButton
                                writerCoin={writerCoin as WriterCoin}
                                isMUSD={isMUSD}
                                action="mint-nft"
                                gameId={game.id}
                                onPaymentSuccess={handleMintSuccess}
                                onPaymentError={() => setShowMintDialog(false)}
                                disabled={isMinting}
                            />
                            <button
                                onClick={() => { triggerHaptic('medium'); setShowMintDialog(false); }}
                                disabled={isMinting}
                                className={cn(
                                  "w-full py-4 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50",
                                  isMUSD ? "text-amber-500/40 hover:text-amber-300" : "text-purple-400/40 hover:text-purple-300"
                                )}
                            >
                                Cancel ARCHIVE
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
