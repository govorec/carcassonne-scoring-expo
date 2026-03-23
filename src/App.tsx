/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Meeple } from './components/Meeple';
import { Settings, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Loader2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Screen = 'start' | 'scoring' | 'loading' | 'history';

interface Player {
  id: number;
  color: string;
  score: number;
  name: string;
  image: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  playerId: number;
  playerColor: string;
  playerImage: string;
  value: number;
  cumulativeScore: number;
}

const COLORS = [
  { name: 'Red', hex: '#B23B2B', asset: '/assets/Meeple_red_Vectorizer-AI.svg' },
  { name: 'Green', hex: '#2EB84B', asset: '/assets/Meeple_green_Vectorizer-AI.svg' },
  { name: 'Blue', hex: '#1E40AF', asset: '/assets/Meeple_blue_Vectorizer-AI.svg' },
  { name: 'Black', hex: '#1A1A1A', asset: '/assets/Meeple_black_Vectorizer-AI.svg' },
  { name: 'Yellow', hex: '#FACC15', asset: '/assets/Meeple_yellow_Vectorizer-AI.svg' },
  { name: 'Gray', hex: '#6B7280', asset: '/assets/Meeple_gray_Vectorizer-AI.svg' },
  { name: 'Pink', hex: '#E678A7', asset: '/assets/Meeple_pink_Vectorizer-AI.svg' },
  { name: 'Orange', hex: '#F97316', asset: '/assets/Meeple_orange_Vectorizer-AI.svg' },
  { name: 'Brown', hex: '#78350F', asset: '/assets/Meeple_brown_Vectorizer-AI.svg' },
];

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [playerCount, setPlayerCount] = useState(6);
  const [selectedColors, setSelectedColors] = useState(COLORS.slice(0, 6));
  const [isCustomNamingEnabled, setIsCustomNamingEnabled] = useState(false);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSkipLoading, setShowSkipLoading] = useState(false);
  const [tempScores, setTempScores] = useState<Record<number, number>>({});
  const timeouts = useRef<Record<number, any>>({});
  const playersRef = useRef<Player[]>([]);
  const tempScoresRef = useRef<Record<number, number>>({});

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    tempScoresRef.current = tempScores;
  }, [tempScores]);

  useEffect(() => {
    console.log('App initializing...');
    const timer = setTimeout(() => {
      setScreen('start');
      console.log('App ready');
    }, 1200);

    const skipTimer = setTimeout(() => {
      setShowSkipLoading(true);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(skipTimer);
      // Clean up all player score timeouts
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (selectedColors.length < playerCount) {
      const newColors = [...selectedColors];
      while (newColors.length < playerCount) {
        const nextAvailable = COLORS.find(c => !newColors.some(nc => nc.hex === c.hex));
        if (nextAvailable) newColors.push(nextAvailable);
        else break;
      }
      setSelectedColors(newColors);
    } else if (selectedColors.length > playerCount) {
      setSelectedColors(selectedColors.slice(0, playerCount));
    }
  }, [playerCount, selectedColors]);

  const rotateColor = (index: number) => {
    const currentColor = selectedColors[index];
    const otherSelectedHexes = selectedColors
      .filter((_, i) => i !== index)
      .map(c => c.hex);
    
    const availablePool = COLORS.filter(c => !otherSelectedHexes.includes(c.hex));
    const poolIndex = availablePool.findIndex(c => c.hex === currentColor.hex);
    const nextPoolIndex = (poolIndex + 1) % availablePool.length;
    const nextColor = availablePool[nextPoolIndex];
    
    const newSelected = [...selectedColors];
    newSelected[index] = nextColor;
    setSelectedColors(newSelected);
  };

  const handleStart = () => {
    const initialPlayers = selectedColors.map((color, index) => ({
      id: index,
      color: color.hex,
      score: 0,
      name: isCustomNamingEnabled ? (customNames[index] || color.name) : color.name,
      image: color.asset,
    }));
    setPlayers(initialPlayers);
    setScreen('scoring');
  };

  const updateScore = (id: number, delta: number) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p
    ));

    // Update temp score
    setTempScores(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + delta
    }));

    // Reset timer
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
    }

    timeouts.current[id] = setTimeout(() => {
      const finalSum = tempScoresRef.current[id];
      if (finalSum !== undefined && finalSum !== 0) {
        const player = playersRef.current.find(p => p.id === id);
        if (player) {
          const entry: HistoryEntry = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
            playerId: id,
            playerColor: player.color,
            playerImage: player.image,
            value: finalSum,
            cumulativeScore: player.score,
          };
          setHistory(h => [entry, ...h]);
        }
      }

      setTempScores(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timeouts.current[id];
    }, 5000);
  };

  const resetScores = () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setTempScores({});
    setHistory([]);
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
    setShowResetModal(false);
  };

  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scale = useMemo(() => {
    const count = players.length;
    const isShort = windowHeight < 700;
    const isVeryShort = windowHeight < 600;

    if (count <= 3) {
      if (isVeryShort) return { meeple: 56, score: 'text-5xl', btnPy: 'py-2', btnText: 'text-base', rowP: 'px-6 py-2', gap: 'gap-2' };
      if (isShort) return { meeple: 70, score: 'text-6xl', btnPy: 'py-3', btnText: 'text-lg', rowP: 'px-7 py-3', gap: 'gap-3' };
      return { meeple: 80, score: 'text-7xl', btnPy: 'py-4', btnText: 'text-xl', rowP: 'px-8 py-4', gap: 'gap-4' };
    }
    if (count <= 4) {
      if (isVeryShort) return { meeple: 44, score: 'text-4xl', btnPy: 'py-1.5', btnText: 'text-sm', rowP: 'px-5 py-1.5', gap: 'gap-1.5' };
      if (isShort) return { meeple: 56, score: 'text-5xl', btnPy: 'py-2', btnText: 'text-base', rowP: 'px-6 py-2', gap: 'gap-2' };
      return { meeple: 70, score: 'text-6xl', btnPy: 'py-3', btnText: 'text-lg', rowP: 'px-7 py-3', gap: 'gap-3' };
    }
    if (count <= 6) {
      if (isVeryShort) return { meeple: 36, score: 'text-3xl', btnPy: 'py-1', btnText: 'text-xs', rowP: 'px-4 py-1', gap: 'gap-1' };
      if (isShort) return { meeple: 44, score: 'text-4xl', btnPy: 'py-1.5', btnText: 'text-sm', rowP: 'px-5 py-1.5', gap: 'gap-1.5' };
      return { meeple: 56, score: 'text-5xl', btnPy: 'py-2', btnText: 'text-base', rowP: 'px-6 py-2', gap: 'gap-2' };
    }
    if (count <= 8) {
      if (isShort) return { meeple: 36, score: 'text-3xl', btnPy: 'py-1', btnText: 'text-xs', rowP: 'px-4 py-1', gap: 'gap-1' };
      return { meeple: 44, score: 'text-4xl', btnPy: 'py-1.5', btnText: 'text-sm', rowP: 'px-5 py-1.5', gap: 'gap-1.5' };
    }
    return { meeple: 32, score: 'text-2xl', btnPy: 'py-0.5', btnText: 'text-[10px]', rowP: 'px-3 py-0.5', gap: 'gap-0.5' };
  }, [players.length, windowHeight]);

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto relative overflow-hidden bg-black flex flex-col">
      <AnimatePresence mode="wait">
        {screen === 'loading' ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-neutral-950 p-8 text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="mb-6 text-white/40"
            >
              <Loader2 size={48} />
            </motion.div>
            <h2 className="text-xl font-bold tracking-tight mb-2">Initializing</h2>
            <p className="text-neutral-500 text-sm mb-8">Preparing board game scoring...</p>
            
            {showSkipLoading && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setScreen('start')}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white/60 text-xs rounded-full border border-white/10 transition-colors"
              >
                Skip Loading
              </motion.button>
            )}
          </motion.div>
        ) : screen === 'start' ? (
          <motion.div
            key="start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col"
          >
            {/* Background */}
            <div className="absolute inset-0 bg-start-screen opacity-90 scale-100" />
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex-1 flex flex-col">
              {/* Top 60% - Meeple Grid */}
              <div className="h-[60%] flex items-center justify-center p-6">
                <div className={`grid grid-cols-3 ${playerCount > 6 ? 'gap-x-4 gap-y-4' : 'gap-x-6 gap-y-8'} w-full max-w-xs mx-auto`}>
                  {selectedColors.map((color, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex flex-col items-center ${playerCount > 6 ? 'gap-1' : 'gap-2'} w-full`}
                    >
                      <div 
                        onClick={() => rotateColor(i)}
                        className="cursor-pointer active:scale-90 transition-transform"
                      >
                        <Meeple 
                          color={color.hex} 
                          size={playerCount > 6 ? 56 : 80} 
                          image={color.asset}
                          className="drop-shadow-2xl" 
                        />
                      </div>
                      <AnimatePresence>
                        {isCustomNamingEnabled && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full px-1"
                          >
                            <input
                              type="text"
                              placeholder={color.name}
                              value={customNames[i] || ''}
                              onChange={(e) => setCustomNames(prev => ({ ...prev, [i]: e.target.value }))}
                              className={`w-full bg-white/10 border border-white/10 rounded-lg px-1 ${playerCount > 6 ? 'py-0.5' : 'py-1'} text-[10px] text-center text-white focus:outline-none focus:border-white/30 placeholder:text-white/20`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom 40% - Locked Control Area */}
              <div className="h-[40%] flex flex-col items-center justify-between p-4 sm:p-6 pb-6 sm:pb-10">
                <div className={`flex flex-col items-center ${windowHeight < 700 ? 'gap-3' : 'gap-6'} w-full`}>
                  {/* Custom Names Toggle */}
                  <div className={`flex items-center gap-3 bg-white/5 px-4 ${windowHeight < 700 ? 'py-1' : 'py-2'} rounded-full border border-white/10`}>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">Custom Names</span>
                    <button
                      onClick={() => setIsCustomNamingEnabled(!isCustomNamingEnabled)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isCustomNamingEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                    >
                      <motion.div
                        animate={{ x: isCustomNamingEnabled ? 22 : 2 }}
                        className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  <div className={`flex flex-col items-center ${windowHeight < 700 ? 'gap-1' : 'gap-2'}`}>
                    <div className={`flex items-center ${windowHeight < 700 ? 'gap-4' : 'gap-8'}`}>
                      <button 
                        onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <ChevronLeft size={windowHeight < 700 ? 32 : 48} strokeWidth={3} />
                      </button>
                      <span className={`${windowHeight < 700 ? 'text-5xl' : 'text-8xl'} font-bold tracking-tighter leading-none`}>{playerCount}</span>
                      <button 
                        onClick={() => setPlayerCount(Math.min(9, playerCount + 1))}
                        className="p-2 text-white/50 hover:text-white transition-colors"
                      >
                        <ChevronRight size={windowHeight < 700 ? 32 : 48} strokeWidth={3} />
                      </button>
                    </div>
                    <span className="text-white/40 text-[10px] uppercase tracking-widest font-medium">Players</span>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  className={`w-full ${windowHeight < 700 ? 'py-3 text-lg' : 'py-5 text-2xl'} bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl font-bold uppercase tracking-widest hover:bg-white/20 transition-colors shadow-lg`}
                >
                  Start
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : screen === 'scoring' ? (
          <motion.div
            key="scoring"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 flex flex-col bg-neutral-900"
          >
            <div className={`p-4 flex justify-between items-center ${players.length > 6 ? 'py-2' : ''}`}>
              <button 
                onClick={() => setScreen('start')}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft size={players.length > 6 ? 24 : 28} />
              </button>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setScreen('history')}
                  className="p-2 text-white/80 hover:text-white transition-colors"
                >
                  <History size={players.length > 6 ? 24 : 28} />
                </button>
                <button 
                  onClick={() => setShowResetModal(true)}
                  className="p-2 text-white/80 hover:text-white transition-colors"
                >
                  <RotateCcw size={players.length > 6 ? 24 : 28} />
                </button>
              </div>
            </div>

            <div className={`flex-1 flex flex-col px-6 pb-4 ${scale.gap}`}>
              {players.map((player) => (
                <div key={player.id} className="flex-1 flex flex-col bg-neutral-800/80 rounded-2xl overflow-hidden shadow-xl border border-white/5 min-h-0">
                  <div className={`${scale.rowP} flex items-center justify-between flex-1 min-h-0`}>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Meeple 
                          color={player.color} 
                          size={scale.meeple} 
                          image={player.image}
                          className="drop-shadow-md" 
                        />
                        <AnimatePresence>
                          {tempScores[player.id] !== undefined && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.5 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              className="absolute inset-0 flex items-center justify-center pointer-events-none"
                            >
                              <span className="text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-xl sm:text-2xl whitespace-nowrap">
                                {tempScores[player.id] > 0 ? `+${tempScores[player.id]}` : tempScores[player.id]}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {isCustomNamingEnabled && (
                        <span className="text-sm font-bold text-white/80 truncate max-w-[100px]">
                          {player.name}
                        </span>
                      )}
                    </div>
                    <span 
                      className={`${scale.score} font-bold tracking-tighter leading-none`} 
                      style={{ 
                        color: player.color,
                        WebkitTextStroke: player.color === '#1A1A1A' ? '0.5px rgba(255, 255, 255, 0.4)' : 'none'
                      }}
                    >
                      {player.score}
                    </span>
                  </div>
                  <div className="flex border-t border-white/5" style={{ backgroundColor: `${player.color}33` }}>
                    {[
                      { label: '-1', val: -1 },
                      { label: '-10', val: -10 },
                      { label: '+1', val: 1 },
                      { label: '+10', val: 10 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => updateScore(player.id, btn.val)}
                        className={`flex-1 ${scale.btnPy} ${scale.btnText} font-bold hover:bg-white/10 transition-colors active:scale-90`}
                        style={{ 
                          color: player.color,
                          WebkitTextStroke: player.color === '#1A1A1A' ? '0.3px rgba(255, 255, 255, 0.6)' : 'none'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Reset Modal */}
            <AnimatePresence>
              {showResetModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-neutral-800 p-8 rounded-3xl w-full max-w-xs text-center shadow-2xl border border-white/10"
                  >
                    <h3 className="text-2xl font-bold mb-6">Reset all scores?</h3>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={resetScores}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-lg transition-colors"
                      >
                        Yes, Reset
                      </button>
                      <button
                        onClick={() => setShowResetModal(false)}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 h-full flex flex-col bg-neutral-900"
          >
            <div className="p-4 flex justify-between items-center border-b border-white/5">
              <button 
                onClick={() => setScreen('scoring')}
                className="p-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft size={28} />
              </button>
              <h2 className="text-xl font-bold tracking-tight">Score History</h2>
              <div className="w-10" /> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 max-h-full touch-pan-y">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4 p-8">
                  <History size={64} strokeWidth={1} />
                  <p className="text-lg font-medium">No scores recorded yet</p>
                </div>
              ) : (
                <div className="flex flex-col pb-8">
                  {history.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between py-2.5 px-4 border-b border-white/5 active:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] text-white/30 font-mono w-10">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Meeple 
                          color={entry.playerColor} 
                          size={24} 
                          image={entry.playerImage}
                          className="drop-shadow-sm" 
                        />
                        {isCustomNamingEnabled && (
                          <span className="text-[10px] font-bold text-white/60 truncate max-w-[60px]">
                            {players.find(p => p.id === entry.playerId)?.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40 font-medium tabular-nums">
                          ({entry.value > 0 ? `+${entry.value}` : entry.value})
                        </span>
                        <span className="text-xl font-bold text-white min-w-[2.5rem] text-right tabular-nums">
                          {entry.cumulativeScore}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
