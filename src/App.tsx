import React, { useState, useEffect, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, useWindowDimensions, TextInput, ScrollView, Animated as RNAnimated, Easing, ImageBackground, FlatList, Keyboard, TouchableWithoutFeedback, Share, Alert, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Meeple } from './components/Meeple';
import { Settings, ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, Loader2, History, Share2, ScrollText, Redo } from 'lucide-react-native';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import Constants from 'expo-constants';
import Slider from '@react-native-community/slider';
import i18n from './i18n';
import '../global.css';

type Screen = 'start' | 'scoring' | 'loading' | 'history' | 'settings';

interface Player {
  id: number;
  color: string;
  image?: any;
  score: number;
  name: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  playerId: number;
  playerColor: string;
  playerImage?: any;
  value: number;
  cumulativeScore: number;
}

const COLORS = [
  { name: 'Red', hex: '#B23B2B', image: require('../assets/Meeple_red.svg') },
  { name: 'Green', hex: '#2EB84B', image: require('../assets/Meeple_green.svg') },
  { name: 'Blue', hex: '#1E40AF', image: require('../assets/Meeple_blue.svg') },
  { name: 'Black', hex: '#1A1A1A', image: Platform.OS === 'android' ? require('../assets/Meeple_black_stroke.svg') : require('../assets/Meeple_black.svg') },
  { name: 'Yellow', hex: '#FACC15', image: require('../assets/Meeple_yellow.svg') },
  { name: 'Gray', hex: '#6B7280', image: require('../assets/Meeple_gray.svg') },
  { name: 'Pink', hex: '#E678A7', image: require('../assets/Meeple_pink.svg') },
  { name: 'Orange', hex: '#F97316', image: require('../assets/Meeple_orange.svg') },
  { name: 'Brown', hex: '#78350F', image: require('../assets/Meeple_brown.svg') },
];
const STORAGE_KEY = '@carcassonne_game_state';

const getMeepleEmoji = (hex: string) => {
  switch (hex.toUpperCase()) {
    case '#B23B2B': return '❤️';
    case '#2EB84B': return '💚';
    case '#1E40AF': return '💙';
    case '#1A1A1A': return '🖤';
    case '#FACC15': return '💛';
    case '#6B7280': return '🩶';
    case '#E678A7': return '🩷';
    case '#F97316': return '🧡';
    case '#78350F': return '🤎';
    default: return '🔘';
  }
};

function MainApp() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
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
  const [scoreTimeout, setScoreTimeout] = useState(3000);
  const [locale, setLocale] = useState(i18n.locale);

  const getLayoutConfig = () => {
    const count = players?.length || 0;
    if (count <= 4) {
      return {
        meepleSize: 56,
        scoreFontSize: 64, //Because it is the tallest element in the top half of the card, it stretches the top container to accommodate it.
        cardPadding: 16, //This is the inner empty wall of the top half of the card. It forces 16px of space above and below the Meeple/Score.
        buttonPadding: 16, //padding inside the adjustment buttons row (above and below the adjustment buttons)
        marginVertical: 8, //space outside and between the cards. Each card has 8px of space above it and 8px below it.
        headerPaddingTop: insets.top + 16, //16
        btnFontSize: 20, //This is the height of the text for the -5, -1, +1, +10 buttons.
        tempScoreFontSize: 32
      };
    }
    if (count === 5) {
      return {
        meepleSize: 52,
        scoreFontSize: 56, //60
        cardPadding: 12, //14
        buttonPadding: 12, //14
        marginVertical: 6,
        headerPaddingTop: insets.top + 8, //12
        btnFontSize: 18,
        tempScoreFontSize: 28
      };
    }
    if (count === 6) {
      return {
        meepleSize: 46,
        scoreFontSize: 46, //50
        cardPadding: 10,
        buttonPadding: 10,
        marginVertical: 4,
        headerPaddingTop: insets.top + 4, //8
        btnFontSize: 16,
        tempScoreFontSize: 22
      };
    }
    return { // 7-9 players
      meepleSize: 36,
      scoreFontSize: 44,
      cardPadding: 8,
      buttonPadding: 8,
      marginVertical: 3,
      headerPaddingTop: insets.top + 0, //8
      btnFontSize: 14,
      tempScoreFontSize: 18
    };
  };

  const layout = getLayoutConfig();

  const { height: windowHeight } = useWindowDimensions();
  //Alert.alert('height; top; bottom:\n' + Math.round(useWindowDimensions().height) + '; ' + Math.round(insets.top) + '; ' + Math.round(insets.bottom));
  //useful screen height values
  //932 - 59 - 34 = 839  iphone 15 pro max
  //923 - 54 - 24 = 845  pixel 9
  //640 - 24 - 24 = 592  small phone

  const timeouts = useRef<Record<number, any>>({});
  const playersRef = useRef<Player[]>([]);
  const tempScoresRef = useRef<Record<number, number>>({});

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
    const initialize = async () => {
      console.log('App initializing...');
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.playerCount) setPlayerCount(data.playerCount);
          if (data.isCustomNamingEnabled !== undefined) setIsCustomNamingEnabled(data.isCustomNamingEnabled);
          if (data.customNames) setCustomNames(data.customNames);
          if (data.players) setPlayers(data.players);
          if (data.history) setHistory(data.history);
          if (data.selectedColors) setSelectedColors(data.selectedColors);
          if (data.scoreTimeout) setScoreTimeout(data.scoreTimeout);
          if (data.locale) {
            i18n.locale = data.locale;
            setLocale(data.locale);
          }
          if (data.screen && data.screen !== 'loading') {
            setScreen(data.screen);
            console.log('Restored screen:', data.screen);
          } else {
            setScreen('start');
          }
        } else {
          setScreen('start');
        }
      } catch (e) {
        console.error('Failed to load state:', e);
        setScreen('start');
      }
      console.log('App ready');
    };

    initialize();

    const skipTimer = setTimeout(() => {
      setShowSkipLoading(true);
    }, 5000);

    return () => {
      clearTimeout(skipTimer);
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  // Save State Effect
  useEffect(() => {
    if (screen === 'loading') return;

    const saveState = async () => {
      try {
        const state = {
          screen,
          playerCount,
          selectedColors,
          isCustomNamingEnabled,
          customNames,
          players,
          history,
          scoreTimeout,
          locale
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.error('Failed to save state:', e);
      }
    };

    saveState();
  }, [screen, playerCount, selectedColors, isCustomNamingEnabled, customNames, players, history, scoreTimeout, locale]);

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
      image: color.image,
      score: 0,
      name: isCustomNamingEnabled ? (customNames[index] || i18n.t(`colors.${color.name}`)) : i18n.t(`colors.${color.name}`),
    }));
    setPlayers(initialPlayers);
    setHistory([]);
    setTempScores({});
    setScreen('scoring');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const updateScore = (id: number, delta: number) => {
    setPlayers(prev => prev.map(p =>
      p.id === id ? { ...p, score: Math.max(0, p.score + delta) } : p
    ));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    }, scoreTimeout);
  };

  const resetScores = async () => {
    setPlayers(prev => prev.map(p => ({ ...p, score: 0 })));
    setTempScores({});
    setHistory([]);
    Object.values(timeouts.current).forEach(clearTimeout);
    timeouts.current = {};
    setShowResetModal(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear state:', e);
    }
  };

  const handleShare = async () => {
    if (players.length === 0) return;

    try {
      const sorted = [...players].sort((a, b) => b.score - a.score);
      const now = new Date();
      const timestamp = now.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      let message = `${i18n.t('share.title')}\n`;
      message += `${timestamp}\n`;
      message += `---------------------------\n`;

      sorted.forEach((player, index) => {
        const rank = index + 1;
        const emoji = getMeepleEmoji(player.color);
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const name = player.name || `Player ${rank}`;

        message += `${rank}. ${emoji} ${name}: ${player.score} ${i18n.t('scoring.points')} ${medal}\n`;
      });

      message += `---------------------------\n`;
      message += i18n.t('share.shared_from');

      await Share.share({ message });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing scoreboard:', error);
    }
  };



  return (
    <ImageBackground
      source={require('../assets/bg.jpg')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' }} />
      {screen === 'loading' && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.8)' }}
        >
          <RNAnimated.View style={{ transform: [{ rotate: spin }], marginBottom: 24, opacity: 0.4 }}>
            <Loader2 color="white" size={48} />
          </RNAnimated.View>
          <Text style={{ fontSize: 20, color: '#FFF', fontWeight: 'bold', letterSpacing: 1, marginBottom: 8, textAlign: 'center' }}>{i18n.t('common.loading')}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 32, textAlign: 'center' }}>{i18n.t('common.preparing')}</Text>

          {showSkipLoading && (
            <Animated.View entering={FadeIn}>
              <TouchableOpacity
                onPress={() => setScreen('start')}
                style={{ paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{i18n.t('common.skip')}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {screen === 'start' && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={{ flex: 1 }}>
              <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20), paddingTop: insets.top }}>

                {/* Settings Button */}
                <TouchableOpacity
                  onPress={() => setScreen('settings')}
                  style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, zIndex: 20, padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999 }}
                >
                  <Settings color="white" size={24} />
                </TouchableOpacity>

                {/* Fixed Title Under Notch */}
                <View style={{ position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
                  <Text style={{
                    color: '#FFF',
                    fontSize: 48,
                    fontWeight: '700',
                    letterSpacing: 2,
                    textShadowColor: 'rgba(0,0,0,0.8)',
                    textShadowOffset: { width: 0, height: 4 },
                    textShadowRadius: 8
                  }}>
                    {i18n.t('common.app_title')}
                  </Text>
                </View>

                {/* Meeple Grid */}
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: 60 }}>
                    {selectedColors.map((color, i) => (
                      <View key={i} style={{ width: '33.33%', alignItems: 'center', marginBottom: 24 }}>
                        <TouchableOpacity
                          onPress={() => rotateColor(i)}
                          activeOpacity={0.7}
                        >
                          <Meeple
                            color={color.hex}
                            size={80}
                            image={color.image}
                          />
                        </TouchableOpacity>
                        {isCustomNamingEnabled && (
                          <Animated.View entering={FadeIn} exiting={FadeOut} style={{ width: '100%', paddingHorizontal: 8, marginTop: 12 }}>
                            <TextInput
                              placeholder={i18n.t('start.placeholder_name', { color: i18n.t(`colors.${color.name}`) })}
                              placeholderTextColor="rgba(255,255,255,0.4)"
                              value={customNames[i] || ''}
                              onChangeText={(text) => setCustomNames(prev => ({ ...prev, [i]: text }))}
                              style={{
                                width: '100%',
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderColor: 'rgba(255,255,255,0.3)',
                                borderWidth: 1,
                                borderRadius: 8,
                                paddingVertical: 6,
                                fontSize: 12,
                                textAlign: 'center',
                                color: '#FFF'
                              }}
                            />
                          </Animated.View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>

                {/* Bottom 40% - Control Section */}
                <View style={{ flex: 0.4, justifyContent: 'flex-end', alignItems: 'center', gap: 40 }}>

                  {/* Custom Names Toggle */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Text style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>{i18n.t('start.custom_names')}</Text>
                    <TouchableOpacity
                      onPress={() => setIsCustomNamingEnabled(!isCustomNamingEnabled)}
                      style={{
                        width: 40,
                        height: 20,
                        borderRadius: 10,
                        justifyContent: 'center',
                        backgroundColor: isCustomNamingEnabled ? '#10B981' : 'rgba(255,255,255,0.2)'
                      }}
                    >
                      <Animated.View
                        style={{
                          width: 14,
                          height: 14,
                          backgroundColor: '#FFF',
                          borderRadius: 7,
                          transform: [{ translateX: isCustomNamingEnabled ? 22 : 4 }]
                        }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Player Number */}
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 30 }}>
                      <TouchableOpacity onPress={() => setPlayerCount(Math.max(2, playerCount - 1))} style={{ padding: 10 }}>
                        <ChevronLeft color="rgba(255,255,255,0.5)" size={48} strokeWidth={3} />
                      </TouchableOpacity>
                      <Text style={{ color: '#FFF', fontSize: 80, fontWeight: 'bold' }}>{playerCount}</Text>
                      <TouchableOpacity onPress={() => setPlayerCount(Math.min(9, playerCount + 1))} style={{ padding: 10 }}>
                        <ChevronRight color="rgba(255,255,255,0.5)" size={48} strokeWidth={3} />
                      </TouchableOpacity>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '600' }}>
                      {['ru', 'uk'].includes(locale) && playerCount >= 5 ? i18n.t('start.players_many') : i18n.t('start.players')}
                    </Text>
                  </View>

                  {/* Start Button Section */}
                  <View style={{ width: '100%', flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={handleStart}
                      style={{
                        flex: 1,
                        height: 60,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.2)'
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, fontSize: 18 }}>{i18n.t('start.start_button')}</Text>
                    </TouchableOpacity>

                    {players.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setScreen('scoring')}
                        style={{
                          width: 60,
                          height: 60,
                          backgroundColor: '#10B981', // Matching Active Toggle Green
                          borderRadius: 16,
                          alignItems: 'center',
                          justifyContent: 'center',
                          elevation: 10,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4
                        }}
                      >
                        <Redo color="#FFF" size={28} />
                      </TouchableOpacity>
                    )}
                  </View>

                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {screen === 'scoring' && (
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutRight}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1 }}>
            {/* Header with explicit Notch Protection */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, paddingTop: layout.headerPaddingTop }}>
              <TouchableOpacity onPress={() => setScreen('start')} style={{ padding: 8 }}>
                <ArrowLeft color="rgba(255,255,255,0.8)" size={players.length > 4 ? 24 : 28} />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <TouchableOpacity onPress={() => setScreen('history')} style={{ padding: 8 }}>
                  <ScrollText color="rgba(255,255,255,0.8)" size={players.length > 4 ? 24 : 28} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={{ padding: 8 }}>
                  <Share2 color="rgba(255,255,255,0.8)" size={players.length > 4 ? 24 : 28} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowResetModal(true)} style={{ padding: 8 }}>
                  <RotateCcw color="rgba(255,255,255,0.8)" size={players.length > 4 ? 24 : 28} />
                </TouchableOpacity>
              </View>
            </View>

            {/* List of Player Cards */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 10) + 16 }}
              showsVerticalScrollIndicator={false}
            >
              {players.map((player) => {
                return (
                  <View key={player.id} style={{
                    flex: (players.length >= 4 && players.length <= 6) ? 1 : undefined,
                    backgroundColor: '#1E1E1E',
                    borderRadius: 16,
                    marginVertical: layout.marginVertical,
                    marginHorizontal: 16,
                    overflow: 'hidden',
                    elevation: 5,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4
                  }}>
                    {/* Top Row (Info) */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: layout.cardPadding, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, paddingRight: 16 }}>
                        <View style={{ position: 'relative' }}>
                          <Meeple color={player.color} size={layout.meepleSize} image={player.image} />
                          {tempScores[player.id] !== undefined && (
                            <Animated.View entering={FadeIn} exiting={FadeOut} style={{ position: 'absolute', top: -10, left: -30, right: -30, bottom: -10, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                              <Text style={{ color: '#FFF', fontWeight: '900', fontSize: layout.tempScoreFontSize, textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 }}>
                                {tempScores[player.id] > 0 ? `+${tempScores[player.id]}` : tempScores[player.id]}
                              </Text>
                            </Animated.View>
                          )}
                        </View>
                        {isCustomNamingEnabled && (
                          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1}>
                            {player.name}
                          </Text>
                        )}
                      </View>
                      <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={{
                          textAlign: 'right',
                          minWidth: 60,
                          color: player.color,
                          fontSize: layout.scoreFontSize,
                          fontWeight: 'bold',
                          letterSpacing: -2,
                          ...(player.color === '#1A1A1A' ? {
                            textShadowColor: 'rgba(255,255,255,0.8)',
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 2
                          } : {})
                        }}
                      >
                        {player.score}
                      </Text>
                    </View>

                    {/* Bottom Row (Buttons) */}
                    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                      {[
                        { label: '-5', val: -5 },
                        { label: '-1', val: -1 },
                        { label: '+1', val: 1 },
                        { label: '+10', val: 10 },
                      ].map((btn) => (
                        <TouchableOpacity
                          key={btn.label}
                          onPress={() => updateScore(player.id, btn.val)}
                          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: layout.buttonPadding, minHeight: 44 }}
                        >
                          <Text style={{
                            color: player.color,
                            fontSize: layout.btnFontSize,
                            fontWeight: 'bold',
                            ...(player.color === '#1A1A1A' ? {
                              textShadowColor: 'rgba(255,255,255,0.8)',
                              textShadowOffset: { width: 0, height: 0 },
                              textShadowRadius: 2
                            } : {})
                          }}>{btn.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Reset Modal */}
            {showResetModal && (
              <Animated.View entering={FadeIn} exiting={FadeOut} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.8)' }}>
                <View style={{ backgroundColor: '#262626', padding: 32, borderRadius: 24, width: '100%', maxWidth: 320, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 24 }}>{i18n.t('scoring.reset_confirm')}</Text>
                  <View style={{ width: '100%', gap: 12 }}>
                    <TouchableOpacity onPress={resetScores} style={{ width: '100%', paddingVertical: 16, backgroundColor: '#DC2626', borderRadius: 12, alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>{i18n.t('common.yes_reset')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ width: '100%', paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>{i18n.t('common.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}

      {screen === 'history' && (
        <Animated.View
          entering={SlideInRight}
          exiting={SlideOutRight}
          style={{ flex: 1 }}
        >
          {/* Dimmer overlay just for history */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)' }} />

          <View style={{ flex: 1 }}>
            {/* Header with explicit Notch Protection */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 20, paddingTop: insets.top + 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
              <TouchableOpacity onPress={() => setScreen('scoring')} style={{ padding: 8 }}>
                <ArrowLeft color="rgba(255,255,255,0.8)" size={28} />
              </TouchableOpacity>
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>{i18n.t('history.title')}</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* List */}
            {history.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ScrollText color="rgba(255,255,255,0.3)" size={64} strokeWidth={1} />
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: '500' }}>{i18n.t('history.empty')}</Text>
              </View>
            ) : (
              <FlatList
                data={history}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20) }}
                renderItem={({ item: entry }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.15)' }}>

                    {/* Col 1 + Col 2 (Left Side) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                      <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 40 }}>
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Meeple color={entry.playerColor} size={20} image={entry.playerImage} />
                        {isCustomNamingEnabled && (
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
                            {players.find(p => p.id === entry.playerId)?.name}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Col 3 + Col 4 (Right Side) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: '600', width: 36, textAlign: 'right' }}>
                        {entry.value > 0 ? `+${entry.value}` : entry.value}
                      </Text>

                      <Text style={{
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: entry.playerColor,
                        minWidth: 40,
                        textAlign: 'right',
                        ...(entry.playerColor === '#1A1A1A' ? {
                          textShadowColor: 'rgba(255,255,255,0.8)',
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 2
                        } : {})
                      }}>
                        {entry.cumulativeScore}
                      </Text>
                    </View>

                  </View>
                )}
              />
            )}
          </View>
        </Animated.View>
      )}

      {/* Settings Screen UI Overlay */}
      {screen === 'settings' && (
        <Animated.View entering={SlideInRight} exiting={SlideOutRight} style={{ flex: 1, backgroundColor: '#262626' }}>
          <View style={{ paddingTop: Math.max(insets.top, 20), paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1F1F1F' }}>
            <TouchableOpacity onPress={() => setScreen('start')} style={{ padding: 8 }}>
              <ArrowLeft color="rgba(255,255,255,0.8)" size={28} />
            </TouchableOpacity>
            <Text style={{ color: '#FFF', fontSize: 24, paddingLeft: 8, fontWeight: 'bold' }}>{i18n.t('settings.title')}</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, gap: 32 }}>

            {/* Timeout Slider */}
            <View style={{ gap: 12 }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>
                {i18n.t('settings.timeout', { seconds: (scoreTimeout / 1000).toFixed(1) })}
              </Text>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={1000}
                maximumValue={10000}
                step={500}
                value={scoreTimeout}
                onValueChange={setScoreTimeout}
                minimumTrackTintColor="#2EB84B"
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor="#FFF"
              />
            </View>

            {/* Language Selector */}
            <View style={{ gap: 16 }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>{i18n.t('settings.language')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {[
                  { code: 'en', label: 'English' },
                  { code: 'de', label: 'Deutsch' },
                  { code: 'fr', label: 'Français' },
                  { code: 'es', label: 'Español' },
                  { code: 'uk', label: 'Українська' },
                  { code: 'ru', label: 'Русский' },
                  { code: 'zh', label: '中文' },
                  { code: 'ja', label: '日本語' },
                ].map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      i18n.locale = lang.code;
                      setLocale(lang.code);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      backgroundColor: locale === lang.code ? 'rgba(46, 184, 75, 0.2)' : 'rgba(255,255,255,0.05)',
                      borderColor: locale === lang.code ? '#2EB84B' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <Text style={{ color: locale === lang.code ? '#FFF' : 'rgba(255,255,255,0.6)', fontWeight: '600' }}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reset Stats */}
            <View style={{ gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    i18n.t('settings.reset_alert_title'),
                    i18n.t('settings.reset_alert_msg'),
                    [
                      { text: i18n.t('common.cancel'), style: 'cancel' },
                      {
                        text: i18n.t('common.yes_reset'),
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await AsyncStorage.clear();
                            setPlayers([]);
                            setHistory([]);
                            setPlayerCount(6);
                            setScoreTimeout(3000);
                            setCustomNames({});
                            setSelectedColors(COLORS.slice(0, 6));
                            setScreen('start');
                            //Alert.alert('Data Cleared', 'App has been successfully reset.');
                          } catch (error) {
                            console.error('Failed to clear data', error);
                          }
                        }
                      }
                    ]
                  );
                }}
                style={{ paddingVertical: 16, backgroundColor: 'rgba(220, 38, 38, 0.2)', borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.5)', borderRadius: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>{i18n.t('settings.reset')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* App Version */}
          <View style={{ paddingHorizontal: 24, paddingVertical: 24, paddingBottom: Math.max(insets.bottom, 24), alignItems: 'center', opacity: 0.5 }}>
            <Text style={{ color: '#FFF', fontSize: 12 }}>
              {i18n.t('settings.version', { version: Constants.expoConfig?.version || '1.0.0' })}
            </Text>
          </View>
        </Animated.View>
      )}

    </ImageBackground>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
