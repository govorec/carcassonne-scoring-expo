import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Animated as RNAnimated, Easing } from 'react-native';
import { Meeple } from './components/Meeple';
import { Settings, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Loader2, History } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import './global.css';

type Screen = 'start' | 'scoring' | 'loading' | 'history';

interface Player {
  id: number;
  color: string;
  score: number;
  name: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  playerId: number;
  playerColor: string;
  value: number;
  cumulativeScore: number;
}

const COLORS = [
  { name: 'Red', hex: '#B23B2B' },
  { name: 'Green', hex: '#2EB84B' },
  { name: 'Blue', hex: '#1E40AF' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Yellow', hex: '#FACC15' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Pink', hex: '#E678A7' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Brown', hex: '#78350F' },
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

  const { height: windowHeight } = useWindowDimensions();

  // Loader rotation string
  const spinValue = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

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
    }));
    setPlayers(initialPlayers);
    setScreen('scoring');
  };

  const updateScore = (id: number, delta: number) => {
    setPlayers(prev => prev.map(p => 
      p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p
    ));

    setTempScores(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + delta
    }));

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
    <View className="flex-1 w-full max-w-md mx-auto relative overflow-hidden bg-black flex-col">
      {screen === 'loading' && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="flex-1 items-center justify-center bg-neutral-950 p-8"
        >
          <RNAnimated.View style={{ transform: [{ rotate: spin }], marginBottom: 24, opacity: 0.4 }}>
            <Loader2 color="white" size={48} />
          </RNAnimated.View>
          <Text className="text-xl text-white font-bold tracking-tight mb-2 text-center">Initializing</Text>
          <Text className="text-neutral-500 text-sm mb-8 text-center">Preparing board game scoring...</Text>
          
          {showSkipLoading && (
            <Animated.View entering={FadeIn}>
              <TouchableOpacity
                onPress={() => setScreen('start')}
                className="px-6 py-2 bg-white/10 rounded-full border border-white/10"
              >
                <Text className="text-white/60 text-xs">Skip Loading</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {screen === 'start' && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="absolute inset-0 flex-col bg-black"
        >
          <View className="relative z-10 flex-1 flex-col">
            <View className="flex-[0.6] items-center justify-center p-6">
              <View className={`flex-row flex-wrap justify-center w-full max-w-xs mx-auto`}>
                {selectedColors.map((color, i) => (
                  <View key={i} className={`items-center w-1/3 p-2 ${playerCount > 6 ? 'gap-1' : 'gap-2'}`}>
                    <TouchableOpacity 
                      onPress={() => rotateColor(i)}
                      activeOpacity={0.7}
                    >
                      <Meeple 
                        color={color.hex} 
                        size={playerCount > 6 ? 56 : 80} 
                        className="shadow-2xl" 
                      />
                    </TouchableOpacity>
                    {isCustomNamingEnabled && (
                      <Animated.View entering={FadeIn} exiting={FadeOut} className="w-full px-1">
                        <TextInput
                          placeholder={color.name}
                          placeholderTextColor="rgba(255,255,255,0.2)"
                          value={customNames[i] || ''}
                          onChangeText={(text) => setCustomNames(prev => ({ ...prev, [i]: text }))}
                          className={`w-full bg-white/10 border border-white/10 rounded-lg px-1 ${playerCount > 6 ? 'py-0.5' : 'py-1'} text-[10px] text-center text-white`}
                        />
                      </Animated.View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <View className="flex-[0.4] items-center justify-between p-4 pb-10">
              <View className={`items-center w-full ${windowHeight < 700 ? 'gap-3' : 'gap-6'}`}>
                <View className={`flex-row items-center gap-3 bg-white/5 px-4 ${windowHeight < 700 ? 'py-1' : 'py-2'} rounded-full border border-white/10`}>
                  <Text className="text-[10px] uppercase tracking-widest font-bold text-white/60">Custom Names</Text>
                  <TouchableOpacity
                    onPress={() => setIsCustomNamingEnabled(!isCustomNamingEnabled)}
                    className={`w-10 h-5 rounded-full justify-center ${isCustomNamingEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <Animated.View
                      className="w-3 h-3 bg-white rounded-full shadow-sm"
                      style={{ transform: [{ translateX: isCustomNamingEnabled ? 22 : 2 }] }}
                    />
                  </TouchableOpacity>
                </View>

                <View className={`items-center ${windowHeight < 700 ? 'gap-1' : 'gap-2'}`}>
                  <View className={`flex-row items-center ${windowHeight < 700 ? 'gap-4' : 'gap-8'}`}>
                    <TouchableOpacity onPress={() => setPlayerCount(Math.max(2, playerCount - 1))} className="p-2">
                      <ChevronLeft color="rgba(255,255,255,0.5)" size={windowHeight < 700 ? 32 : 48} strokeWidth={3} />
                    </TouchableOpacity>
                    <Text className={`text-white ${windowHeight < 700 ? 'text-5xl' : 'text-8xl'} font-bold tracking-tighter`}>{playerCount}</Text>
                    <TouchableOpacity onPress={() => setPlayerCount(Math.min(9, playerCount + 1))} className="p-2">
                      <ChevronRight color="rgba(255,255,255,0.5)" size={windowHeight < 700 ? 32 : 48} strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-white/40 text-[10px] uppercase tracking-widest font-medium">Players</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleStart}
                className={`w-full ${windowHeight < 700 ? 'py-3' : 'py-5'} bg-white/10 border border-white/20 rounded-2xl items-center justify-center shadow-lg`}
              >
                <Text className="text-white font-bold uppercase tracking-widest text-lg">Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {screen === 'scoring' && (
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutRight}
          className="absolute inset-0 flex-col bg-neutral-900 pt-10"
        >
          <View className={`flex-row justify-between items-center px-4 pb-2 ${players.length > 6 ? 'pt-2' : ''}`}>
            <TouchableOpacity onPress={() => setScreen('start')} className="p-2">
              <ArrowLeft color="rgba(255,255,255,0.8)" size={players.length > 6 ? 24 : 28} />
            </TouchableOpacity>
            <View className="flex-row items-center gap-2">
              <TouchableOpacity onPress={() => setScreen('history')} className="p-2">
                <History color="rgba(255,255,255,0.8)" size={players.length > 6 ? 24 : 28} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowResetModal(true)} className="p-2">
                <RotateCcw color="rgba(255,255,255,0.8)" size={players.length > 6 ? 24 : 28} />
              </TouchableOpacity>
            </View>
          </View>

          <View className={`flex-1 px-6 pb-4 ${scale.gap}`}>
            {players.map((player) => (
              <View key={player.id} className="flex-1 bg-neutral-800/80 rounded-2xl overflow-hidden shadow-xl border border-white/5">
                <View className={`${scale.rowP} flex-row items-center justify-between flex-1`}>
                  <View className="flex-row items-center gap-4">
                    <View className="relative">
                      <Meeple color={player.color} size={scale.meeple} className="shadow-md" />
                      {tempScores[player.id] !== undefined && (
                        <Animated.View entering={FadeIn} exiting={FadeOut} className="absolute inset-0 items-center justify-center">
                          <Text className="text-white font-black text-xl shadow-lg shadow-black">
                            {tempScores[player.id] > 0 ? `+${tempScores[player.id]}` : tempScores[player.id]}
                          </Text>
                        </Animated.View>
                      )}
                    </View>
                    {isCustomNamingEnabled && (
                      <Text className="text-sm font-bold text-white/80" numberOfLines={1}>{player.name}</Text>
                    )}
                  </View>
                  <Text className={`${scale.score} font-bold tracking-tighter`} style={{ color: player.color }}>
                    {player.score}
                  </Text>
                </View>
                <View className="flex-row border-t border-white/5" style={{ backgroundColor: `${player.color}33` }}>
                  {[
                    { label: '-1', val: -1 },
                    { label: '-10', val: -10 },
                    { label: '+1', val: 1 },
                    { label: '+10', val: 10 },
                  ].map((btn) => (
                    <TouchableOpacity
                      key={btn.label}
                      onPress={() => updateScore(player.id, btn.val)}
                      className={`flex-1 items-center justify-center ${scale.btnPy}`}
                    >
                      <Text className={`${scale.btnText} font-bold`} style={{ color: player.color }}>{btn.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {showResetModal && (
            <Animated.View entering={FadeIn} exiting={FadeOut} className="absolute inset-0 z-50 items-center justify-center p-6 bg-black/80">
              <View className="bg-neutral-800 p-8 rounded-3xl w-full max-w-xs items-center border border-white/10">
                <Text className="text-white text-2xl font-bold mb-6">Reset all scores?</Text>
                <View className="w-full gap-3">
                  <TouchableOpacity onPress={resetScores} className="w-full py-4 bg-red-600 rounded-xl items-center mb-3">
                    <Text className="text-white font-bold text-lg">Yes, Reset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowResetModal(false)} className="w-full py-4 bg-white/10 rounded-xl items-center">
                    <Text className="text-white font-bold text-lg">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {screen === 'history' && (
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutRight}
          className="absolute inset-0 flex-col bg-neutral-900 pt-10"
        >
          <View className="flex-row items-center justify-between p-4 border-b border-white/5">
            <TouchableOpacity onPress={() => setScreen('scoring')} className="p-2">
              <ArrowLeft color="rgba(255,255,255,0.8)" size={28} />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold tracking-tight">Score History</Text>
            <View className="w-10" />
          </View>

          <ScrollView className="flex-1">
            {history.length === 0 ? (
              <View className="flex-1 items-center justify-center p-8 mt-20 gap-4">
                <History color="rgba(255,255,255,0.3)" size={64} strokeWidth={1} />
                <Text className="text-white/30 text-lg font-medium">No scores recorded yet</Text>
              </View>
            ) : (
              <View className="pb-8">
                {history.map((entry) => (
                  <View key={entry.id} className="flex-row items-center justify-between py-3 px-4 border-b border-white/5">
                    <View className="flex-row items-center gap-4">
                      <Text className="text-[10px] text-white/30 w-10">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Meeple color={entry.playerColor} size={24} />
                      {isCustomNamingEnabled && (
                        <Text className="text-[10px] font-bold text-white/60">
                          {players.find(p => p.id === entry.playerId)?.name}
                        </Text>
                      )}
                    </View>
                    
                    <View className="flex-row items-center gap-3">
                      <Text className="text-xs text-white/40 font-medium">
                        ({entry.value > 0 ? `+${entry.value}` : entry.value})
                      </Text>
                      <Text className="text-xl font-bold text-white min-w-[2.5rem] text-right">
                        {entry.cumulativeScore}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}
