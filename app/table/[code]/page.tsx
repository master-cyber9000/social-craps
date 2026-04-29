"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PlayerAvatar, Player } from '@/app/components/PlayerAvatar';
import { LiveKitRoom, RoomAudioRenderer, useParticipants, ParticipantTile, TrackToggle } from '@livekit/components-react';
import { ChatSidebar } from '@/app/components/ChatSidebar';
interface SpeechBubble {
  playerId: string;
  message: string;
  timestamp: number;
}

const LiveTableAvatar = (props: React.ComponentProps<typeof PlayerAvatar>) => {
  const participants = useParticipants();
  const participant = participants.find(p => p.identity === props.player.player_id);
  const isSpeaking = participant?.isSpeaking || false;

  return <PlayerAvatar {...props} isSpeaking={isSpeaking} />;
};

const Dice = ({ value }: { value: number }) => {
  const pipMap: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
  };
  
  return (
    <div className="w-6 h-6 bg-white rounded-[4px] shadow-sm flex items-center justify-center p-[2px]">
      <div className="grid grid-cols-3 grid-rows-3 gap-[2px] w-full h-full">
        {[0,1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className={`rounded-full w-full h-full ${pipMap[value]?.includes(i) ? 'bg-black' : ''}`} />
        ))}
      </div>
    </div>
  );
};

const BigDice = ({ value, isTumbling, animationClass }: { value: number | null, isTumbling: boolean, animationClass: string }) => {
  const [displayVal, setDisplayVal] = useState(value || 1);
  
  useEffect(() => {
    if (isTumbling) {
      const interval = setInterval(() => {
        setDisplayVal(Math.floor(Math.random() * 6) + 1);
      }, 80);
      return () => clearInterval(interval);
    } else {
      if (value) setDisplayVal(value);
    }
  }, [isTumbling, value]);

  const pips = [];
  const pipClass = "absolute w-6 h-6 bg-black rounded-full";

  if (displayVal === 1 || displayVal === 3 || displayVal === 5) {
    pips.push(<div key="center" className={`${pipClass} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />);
  }
  if (displayVal === 2 || displayVal === 3 || displayVal === 4 || displayVal === 5 || displayVal === 6) {
    pips.push(<div key="tr" className={`${pipClass} top-6 right-6`} />);
    pips.push(<div key="bl" className={`${pipClass} bottom-6 left-6`} />);
  }
  if (displayVal === 4 || displayVal === 5 || displayVal === 6) {
    pips.push(<div key="tl" className={`${pipClass} top-6 left-6`} />);
    pips.push(<div key="br" className={`${pipClass} bottom-6 right-6`} />);
  }
  if (displayVal === 6) {
    pips.push(<div key="ml" className={`${pipClass} top-1/2 left-6 -translate-y-1/2`} />);
    pips.push(<div key="mr" className={`${pipClass} top-1/2 right-6 -translate-y-1/2`} />);
  }

  return (
    <div className={`w-[120px] h-[120px] bg-white rounded-2xl shadow-2xl relative ${isTumbling ? animationClass : 'animate-dice-settle'}`}>
       {pips}
    </div>
  );
}

const RestingDice = ({ value }: { value: number }) => {
  const pips = [];
  const pipClass = "absolute w-2.5 h-2.5 bg-black rounded-full";

  if (value === 1 || value === 3 || value === 5) {
    pips.push(<div key="center" className={`${pipClass} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`} />);
  }
  if (value === 2 || value === 3 || value === 4 || value === 5 || value === 6) {
    pips.push(<div key="tr" className={`${pipClass} top-2 right-2`} />);
    pips.push(<div key="bl" className={`${pipClass} bottom-2 left-2`} />);
  }
  if (value === 4 || value === 5 || value === 6) {
    pips.push(<div key="tl" className={`${pipClass} top-2 left-2`} />);
    pips.push(<div key="br" className={`${pipClass} bottom-2 right-2`} />);
  }
  if (value === 6) {
    pips.push(<div key="ml" className={`${pipClass} top-1/2 left-2 -translate-y-1/2`} />);
    pips.push(<div key="mr" className={`${pipClass} top-1/2 right-2 -translate-y-1/2`} />);
  }

  return (
    <div className="w-[48px] h-[48px] bg-white rounded-[10px] shadow-lg relative shrink-0">
       {pips}
    </div>
  );
}

const CHIPS = [
  { val: 1, label: '$1', colorClass: 'bg-white text-black border-gray-300' },
  { val: 2, label: '$2', colorClass: 'bg-[#ef4444] text-white border-red-700' },
  { val: 5, label: '$5', colorClass: 'bg-[#22c55e] text-white border-green-700' },
  { val: 10, label: '$10', colorClass: 'bg-black text-white border-gray-700' },
  { val: 20, label: '$20', colorClass: 'bg-[#a855f7] text-white border-purple-700' },
  { val: 50, label: '$50', colorClass: 'bg-[#eab308] text-black border-yellow-600' },
];

const getLargestChipColor = (amount: number) => {
  for (let i = CHIPS.length - 1; i >= 0; i--) {
    if (amount >= CHIPS[i].val) return CHIPS[i].colorClass;
  }
  return CHIPS[0].colorClass;
};

const PLACE_PAYOUTS: Record<number, [number, number]> = {
  2: [13, 2], 3: [15, 4], 4: [9, 5], 5: [7, 5],
  6: [7, 6], 8: [7, 6], 9: [7, 5], 10: [9, 5],
  11: [15, 4], 12: [13, 2]
};

const BUY_PAYOUTS: Record<number, [number, number]> = {
  4: [2, 1], 5: [3, 2], 6: [6, 5],
  8: [6, 5], 9: [3, 2], 10: [2, 1]
};

export default function Home() {
  const { code } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const playersRef = useRef<Player[]>([]);
  const [isShooter, setIsShooter] = useState(false);
  const [character, setCharacter] = useState<any>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [toasts, setToasts] = useState<{id: string, msg: string}[]>([]);
  const [localTier, setLocalTier] = useState<1 | 2 | 3>(3);

  const [die1, setDie1] = useState<number | null>(null);
  const [die2, setDie2] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isTumbling, setIsTumbling] = useState(false);
  
  const [restingDie1, setRestingDie1] = useState<number | null>(null);
  const [restingDie2, setRestingDie2] = useState<number | null>(null);
  const [restingTotal, setRestingTotal] = useState<number | null>(null);
  const [diceResting, setDiceResting] = useState(false);

  const [balance, setBalance] = useState(100);
  const [totalBets, setTotalBets] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [passLineBet, setPassLineBet] = useState(0);
  const [dontPassBet, setDontPassBet] = useState(0);
  const [phase, setPhase] = useState<'come-out' | 'point'>('come-out');
  const [point, setPoint] = useState<number | null>(null);
  const phaseRef = useRef(phase);
  const pointRef = useRef(point);
  const die1Ref = useRef(die1);
  const die2Ref = useRef(die2);
  const prevDie1 = useRef<number | null>(null);
  const prevDie2 = useRef<number | null>(null);
  const [puckState, setPuckState] = useState<'ON' | 'OFF'>('OFF');
  const [puckNumber, setPuckNumber] = useState<number | null>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { pointRef.current = point; }, [point]);
  useEffect(() => { die1Ref.current = die1; }, [die1]);
  useEffect(() => { die2Ref.current = die2; }, [die2]);
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (isChatOpen) setUnreadCount(0);
  }, [isChatOpen]);

  const postGameEvent = async (msg: string) => {
    await supabase.from('craps_messages').insert({
      table_code: code,
      player_id: 'system',
      display_name: '🎲 Table',
      avatar: '🎲',
      tier: 0,
      content: msg,
      created_at: new Date().toISOString()
    });
  };
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [tableFlash, setTableFlash] = useState<'green' | 'red' | 'gold' | null>(null);
  const [shakeZone, setShakeZone] = useState<string | null>(null);
  const [winPulse, setWinPulse] = useState(false);
  const [dpWinPulse, setDpWinPulse] = useState(false);
  const [pushZone, setPushZone] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{zone: string, msg: string} | null>(null);
  const [showLowFundsToast, setShowLowFundsToast] = useState(false);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  interface Bet {
    bet_type: string;
    amount: number;
    status: string;
    point: number | null;
  }
  const [shooterBets, setShooterBets] = useState<Bet[]>([]);

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  useEffect(() => {
    if (showLowFundsToast) {
      const timer = setTimeout(() => setShowLowFundsToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showLowFundsToast]);

  useEffect(() => {
    const savedLang = localStorage.getItem('craps-language') as 'en' | 'es' | null;
    if (savedLang) setLang(savedLang);

    const characterStr = localStorage.getItem('craps-character');
    if (!characterStr) {
      router.push('/create-character');
      return;
    }
    const char = JSON.parse(characterStr);
    setCharacter(char);

    console.log('Component mount - Room code:', code);
    console.log('Component mount - Local player ID:', char.playerId);

    const loadTable = async () => {
      const { data: roomData } = await supabase
        .from('craps_tables')
        .select('*')
        .eq('code', code)
        .single();

      if (!roomData) {
        router.push('/');
        return;
      }

      const { data: playersData } = await supabase
        .from('craps_players')
        .select('*')
        .eq('table_code', code);

      let currentPlayers = playersData ?? [];
      const existingPlayer = currentPlayers.find(p => p.player_id === char.playerId);
      const shooter = roomData.current_shooter_id === char.playerId;
      
      let assignedTier: 1 | 2 | 3 = 3;

      if (!existingPlayer) {
        // Player not in DB, determine tier and insert
        const access = searchParams.get('access');
        assignedTier = shooter ? 1 : (access === 'closefriend' ? 1 : (access === 'friend' ? 2 : 3));
        
        const { error } = await supabase.from('craps_players').insert({
          table_code: code,
          player_id: char.playerId,
          display_name: char.displayName,
          avatar: char.avatar,
          border_color: char.borderColor,
          tier: assignedTier,
          balance: 100.00,
          is_connected: true,
          seat_number: assignedTier === 1 ? currentPlayers.filter(p => p.tier === 1).length + 1 : null
        });
        
        if (!error) {
          const { data: newPlayers } = await supabase.from('craps_players').select('*').eq('table_code', code);
          if (newPlayers) currentPlayers = newPlayers;
        }
      } else {
        assignedTier = existingPlayer.tier as 1 | 2 | 3;
        await supabase
          .from('craps_players')
          .update({ is_connected: true })
          .eq('table_code', code)
          .eq('player_id', char.playerId);
      }

      if (roomData) {
        if (roomData.phase) setPhase(roomData.phase);
        if (roomData.point !== undefined) setPoint(roomData.point);
        if (roomData.phase === 'point' && roomData.point) {
          setPuckState('ON');
          setPuckNumber(roomData.point);
        } else {
          setPuckState('OFF');
          setPuckNumber(null);
        }
        if (roomData.last_roll_die1 && roomData.last_roll_die2) {
          setRestingDie1(roomData.last_roll_die1);
          setRestingDie2(roomData.last_roll_die2);
          setRestingTotal(roomData.last_roll_total);
          setDiceResting(true);
        }
      }

      setLocalTier(assignedTier);
      setRoom(roomData);
      setPlayers(currentPlayers);
      playersRef.current = currentPlayers;
      setIsShooter(shooter);

      if (!shooter && roomData) {
        const { data: bets } = await supabase
          .from('craps_bets')
          .select('*')
          .eq('table_code', code)
          .eq('status', 'active');
        if (bets) {
          setDisplayState({
            passLineBet: bets.find(b => b.bet_type === 'pass-line')?.amount ?? 0,
            dontPassBet: bets.find(b => b.bet_type === 'dont-pass')?.amount ?? 0,
            fieldBet: bets.find(b => b.bet_type === 'field')?.amount ?? 0,
            placeBets: bets.filter(b => b.bet_type.startsWith('place-'))
              .map(b => ({ id: Math.random().toString(), number: parseInt(b.bet_type.split('-')[1]), amount: b.amount })),
            buyBets: bets.filter(b => b.bet_type.startsWith('buy-'))
              .map(b => ({ id: Math.random().toString(), number: parseInt(b.bet_type.split('-')[1]), amount: b.amount })),
            comeBets: bets.filter(b => b.bet_type === 'come' || b.bet_type.startsWith('come-'))
              .map(b => ({ id: Math.random().toString(), point: b.point, amount: b.amount })),
            dontComeBets: bets.filter(b => b.bet_type === 'dont-come' || b.bet_type.startsWith('dont-come-'))
              .map(b => ({ id: Math.random().toString(), point: b.point, amount: b.amount })),
            passOddsBet: bets.find(b => b.bet_type === 'pass-odds')?.amount ?? 0,
            dontPassOddsBet: bets.find(b => b.bet_type === 'dont-odds')?.amount ?? 0,
            phase: roomData.phase,
            point: roomData.point,
            puckIsOn: roomData.phase === 'point' && roomData.point !== null,
            shooterBalance: roomData.shooter_balance ?? 100,
            shooterBet: roomData.shooter_total_bet ?? 0,
            lastWin: roomData.last_win ?? 0,
            lastRollDie1: roomData.last_roll_die1,
            lastRollDie2: roomData.last_roll_die2,
          });
        }
      }

      // Fetch Initial Messages
      const { data: initialMessages } = await supabase
        .from('craps_messages')
        .select('*')
        .eq('table_code', code)
        .order('created_at', { ascending: true })
        .limit(50);
      if (initialMessages) setMessages(initialMessages);

      // Fetch LiveKit Token
      if (assignedTier === 1 || assignedTier === 2) {
        try {
          const res = await fetch(`/api/livekit-token?room=${code}&username=${encodeURIComponent(char.displayName)}&userId=${char.playerId}`);
          const data = await res.json();
          if (data.token) {
            setLkToken(data.token);
          }
        } catch (e) {
          console.error("Failed to fetch LiveKit token", e);
        }
      }
    };

    loadTable();
    
    // Cleanup disconnected players
    supabase.rpc('cleanup_disconnected_players').then();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel('presence-' + code)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'craps_players',
        filter: `table_code=eq.${code}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPlayer = payload.new as Player;
          setPlayers(prev => {
            const exists = prev.some(p => p.player_id === newPlayer.player_id);
            if (exists) return prev;
            const next = [...prev, newPlayer];
            playersRef.current = next;
            return next;
          });
          // Check if it's not the local player
          if (newPlayer.player_id !== char.playerId) {
            const msg = lang === 'en' ? `${newPlayer.display_name} joined the rail` : `${newPlayer.display_name} se unió a la baranda`;
            const id = Math.random().toString();
            setToasts(prev => [...prev, { id, msg }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
          }
        }
        if (payload.eventType === 'UPDATE') {
          const updatedPlayer = payload.new as Player;
          const oldPlayerState = playersRef.current.find(p => p.player_id === updatedPlayer.player_id);

          setPlayers(prev => {
            const next = prev.map(p => p.player_id === updatedPlayer.player_id ? updatedPlayer : p);
            playersRef.current = next;
            return next;
          });

          // Check if player disconnected
          if (updatedPlayer.player_id !== char.playerId && oldPlayerState && oldPlayerState.is_connected && !updatedPlayer.is_connected) {
            const msg = lang === 'en' ? `${updatedPlayer.display_name} disconnected` : `${updatedPlayer.display_name} se desconectó`;
            const id = Math.random().toString();
            setToasts(prev => [...prev, { id, msg }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
          }

          // Check if player reconnected
          if (updatedPlayer.player_id !== char.playerId && oldPlayerState && !oldPlayerState.is_connected && updatedPlayer.is_connected) {
            const msg = lang === 'en' ? `${updatedPlayer.display_name} reconnected` : `${updatedPlayer.display_name} se reconectó`;
            const id = Math.random().toString();
            setToasts(prev => [...prev, { id, msg }]);
            setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
          }
        }
        if (payload.eventType === 'DELETE') {
          setPlayers(prev => {
            const next = prev.filter(p => p.player_id !== payload.old.player_id);
            playersRef.current = next;
            return next;
          });
        }
      })
      .subscribe();

    const messagesChannel = supabase
      .channel('messages-' + code)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'craps_messages',
        filter: `table_code=eq.${code}`
      }, (payload) => {
        const msg = payload.new;
        setMessages(prev => [...prev, msg]);
        
        if (!isChatOpenRef.current) {
          setUnreadCount(prev => prev + 1);
        }

        if (msg.tier === 1) {
          setSpeechBubbles(prev => [
            ...prev.filter(b => b.playerId !== msg.player_id),
            { playerId: msg.player_id, message: msg.content, timestamp: Date.now() }
          ]);
          setTimeout(() => {
            setSpeechBubbles(prev => prev.filter(b => b.playerId !== msg.player_id));
          }, 4000);
        }
      })
      .subscribe();

    const determineOutcomeForRail = (
      total: number,
      phaseBefore: string,
      pointBefore: number | null
    ) => {
      if (phaseBefore === 'come-out') {
        if (total === 7 || total === 11) return 'NATURAL!';
        else if (total !== 2 && total !== 3 && total !== 12) return `POINT IS ${total}`;
        else return null;
      } else {
        if (total === 7) return 'SEVEN OUT!';
        else if (total === pointBefore) return 'POINT HIT!';
        else return null;
      }
    };



    const triggerDiceAnimation = (d1: number, d2: number) => {
      setTimeout(() => {
        setDie1(d1);
        setDie2(d2);
        setTotal(d1 + d2);
        setIsRolling(true);
        setIsTumbling(true);
        
        setTimeout(() => {
          setIsTumbling(false);
        }, 1500);

        setTimeout(() => {
          setIsRolling(false);
          setRestingDie1(d1);
          setRestingDie2(d2);
          setRestingTotal(d1 + d2);
          setDiceResting(true);
          setPushZone(null);
        }, 3000);
      }, 100);
    };

    const handleGameStateUpdate = async (newState: any) => {
      if (newState.last_updated_by === char.playerId) return;

      if (newState.last_roll_die1 && newState.last_roll_die2) {
        const isNewRoll = 
          newState.last_roll_die1 !== die1Ref.current || 
          newState.last_roll_die2 !== die2Ref.current;
        
        if (isNewRoll) {
          triggerDiceAnimation(newState.last_roll_die1, newState.last_roll_die2);
          
          const outcome = determineOutcomeForRail(
            newState.last_roll_total,
            phaseRef.current,
            pointRef.current
          );
          
          setTimeout(() => {
            if (outcome) {
              setBannerMsg(outcome);
              if (outcome === 'NATURAL!' || outcome === 'POINT HIT!') setTableFlash('green');
              if (outcome === 'SEVEN OUT!') setTableFlash('red');
              if (outcome.startsWith('POINT IS')) setTableFlash('gold');
              
              setTimeout(() => {
                setBannerMsg(null);
                setTableFlash(null);
              }, 3000);
            }
          }, 3100);
        }
      }

      if (newState.phase) setPhase(newState.phase);
      if (newState.point !== undefined) setPoint(newState.point);

      setDisplayState(prev => ({
        ...prev,
        phase: newState.phase,
        point: newState.point,
        puckIsOn: newState.phase === 'point' && newState.point !== null,
        shooterBalance: newState.shooter_balance ?? prev.shooterBalance,
        shooterBet: newState.shooter_total_bet ?? prev.shooterBet,
        lastWin: newState.last_win ?? prev.lastWin,
        lastRollDie1: newState.last_roll_die1,
        lastRollDie2: newState.last_roll_die2,
      }));

      if (!isShooter) {
        const { data: bets } = await supabase
          .from('craps_bets')
          .select('*')
          .eq('table_code', code)
          .eq('status', 'active');
        if (bets) updateDisplayStateBets(bets);
      }
    };

    const gameChannel = supabase
      .channel('game-' + code)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'craps_tables',
        filter: `code=eq.${code}`
      }, (payload) => {
        handleGameStateUpdate(payload.new);
      })
      .subscribe();

    const updateDisplayStateBets = (bets: any[]) => {
      setDisplayState(prev => ({
        ...prev,
        passLineBet: bets.find(b => b.bet_type === 'pass-line')?.amount ?? 0,
        dontPassBet: bets.find(b => b.bet_type === 'dont-pass')?.amount ?? 0,
        fieldBet: bets.find(b => b.bet_type === 'field')?.amount ?? 0,
        placeBets: bets.filter(b => b.bet_type.startsWith('place-'))
          .map(b => ({ id: Math.random().toString(), number: parseInt(b.bet_type.split('-')[1]), amount: b.amount })),
        buyBets: bets.filter(b => b.bet_type.startsWith('buy-'))
          .map(b => ({ id: Math.random().toString(), number: parseInt(b.bet_type.split('-')[1]), amount: b.amount })),
        comeBets: bets.filter(b => b.bet_type === 'come' || b.bet_type.startsWith('come-'))
          .map(b => ({ id: Math.random().toString(), point: b.point, amount: b.amount })),
        dontComeBets: bets.filter(b => b.bet_type === 'dont-come' || b.bet_type.startsWith('dont-come-'))
          .map(b => ({ id: Math.random().toString(), point: b.point, amount: b.amount })),
        passOddsBet: bets.find(b => b.bet_type === 'pass-odds')?.amount ?? 0,
        dontPassOddsBet: bets.find(b => b.bet_type === 'dont-odds')?.amount ?? 0,
      }));
    };

    const betsChannel = supabase
      .channel('bets-' + code)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'craps_bets',
        filter: `table_code=eq.${code}`
      }, async (payload) => {
        console.log('RAIL: INSERT received', payload.new);
        if (!isShooter) {
          const { data: bets } = await supabase.from('craps_bets').select('*').eq('table_code', code).eq('status', 'active');
          if (bets) updateDisplayStateBets(bets);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'craps_bets',
        filter: `table_code=eq.${code}`
      }, async (payload) => {
        console.log('RAIL: UPDATE received', payload.new);
        if (!isShooter) {
          const { data: bets } = await supabase.from('craps_bets').select('*').eq('table_code', code).eq('status', 'active');
          if (bets) updateDisplayStateBets(bets);
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'craps_bets',
        filter: `table_code=eq.${code}`
      }, (payload) => {
        console.log('RAIL: DELETE received', payload.old);
        if (!isShooter && payload.old && payload.old.bet_type) {
          setDisplayState(prev => ({
            ...prev,
            passLineBet: payload.old.bet_type === 'pass-line' ? 0 : prev.passLineBet,
            dontPassBet: payload.old.bet_type === 'dont-pass' ? 0 : prev.dontPassBet,
            fieldBet: payload.old.bet_type === 'field' ? 0 : prev.fieldBet,
            placeBets: payload.old.bet_type.startsWith('place-') 
              ? prev.placeBets.filter(b => b.number !== parseInt(payload.old.bet_type.split('-')[1]))
              : prev.placeBets,
            buyBets: payload.old.bet_type.startsWith('buy-')
              ? prev.buyBets.filter(b => b.number !== parseInt(payload.old.bet_type.split('-')[1]))
              : prev.buyBets,
            comeBets: payload.old.bet_type.startsWith('come-')
              ? prev.comeBets.filter(b => b.point !== parseInt(payload.old.bet_type.split('-')[1]))
              : (payload.old.bet_type === 'come' ? prev.comeBets.filter(b => b.point !== null) : prev.comeBets),
            dontComeBets: payload.old.bet_type.startsWith('dont-come-')
              ? prev.dontComeBets.filter(b => b.point !== parseInt(payload.old.bet_type.split('-')[2]))
              : (payload.old.bet_type === 'dont-come' ? prev.dontComeBets.filter(b => b.point !== null) : prev.dontComeBets),
          }));
        }
      })
      .subscribe((status) => {
        console.log('Bets subscription status:', status);
      });

    const handleBeforeUnload = () => {
      // Use raw fetch with keepalive to ensure it fires during tab close
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/craps_players?table_code=eq.${code}&player_id=eq.${char.playerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`
        },
        body: JSON.stringify({ is_connected: false }),
        keepalive: true
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(betsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [code, router]);

  const syncBetToSupabase = async (bet: {
    betType: string;
    amount: number;
    status: string;
    point: number | null;
  }) => {
    if (!character?.playerId || !isShooter) return;
    
    console.log('ATTEMPTING BET SYNC:', { betType: bet.betType, amount: bet.amount, point: bet.point, roomCode: code, localPlayerId: character.playerId })
    
    const { data, error } = await supabase
      .from('craps_bets')
      .upsert({
        table_code: code,
        player_id: character.playerId,
        bet_type: bet.betType,
        amount: bet.amount,
        status: bet.status,
        point: bet.point,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'table_code, player_id, bet_type'
      })
      .select()

    if (error) {
      console.error('BET SYNC FAILED:', error.message, error.details, error.hint)
    } else {
      console.log('BET SYNC SUCCESS:', data)
    }
  };

  const removeBetFromSupabase = async (betType: string) => {
    if (!character?.playerId || !isShooter) return;
    console.log('REMOVING BET FROM SUPABASE:', betType);
    const { error } = await supabase
      .from('craps_bets')
      .delete()
      .eq('table_code', code)
      .eq('player_id', character.playerId)
      .eq('bet_type', betType);
    
    if (error) {
      console.error('BET REMOVAL FAILED:', error.message);
    } else {
      console.log('BET REMOVAL SUCCESS:', betType);
    }
  };

  const syncBetResolution = async (resolvedBets: {
    betType: string;
    status: 'won' | 'lost' | 'pushed';
    payout: number;
  }[]) => {
    if (!character?.playerId || !isShooter) return;
    for (const bet of resolvedBets) {
      if (bet.status === 'lost' || bet.betType === 'field') {
        await removeBetFromSupabase(bet.betType);
      } else {
        await supabase
          .from('craps_bets')
          .update({
            status: bet.status,
            payout: bet.payout,
            updated_at: new Date().toISOString()
          })
          .eq('table_code', code)
          .eq('player_id', character.playerId)
          .eq('bet_type', bet.betType);
      }
    }
  };

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'es' : 'en';
    setLang(newLang);
    localStorage.setItem('craps-language', newLang);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !character) return;
    
    await supabase.from('craps_messages').insert({
      table_code: code,
      player_id: character.playerId,
      display_name: character.displayName,
      avatar: character.avatar,
      tier: localTier,
      content: newMessage.substring(0, 200),
      created_at: new Date().toISOString()
    });
    setNewMessage('');
  };

  interface PointBet {
    id: string;
    amount: number;
    point: number | null;
    isUnlocked?: boolean;
  }
  const [comeBets, setComeBets] = useState<PointBet[]>([]);
  const [dontComeBets, setDontComeBets] = useState<PointBet[]>([]);
  const [comeFlash, setComeFlash] = useState<string | null>(null);
  const [dcFlash, setDcFlash] = useState<string | null>(null);

  // Phase 5 State
  const [fieldBet, setFieldBet] = useState(0);
  const [fieldFlash, setFieldFlash] = useState<string | null>(null);

  interface PlaceBet {
    id: string;
    number: number;
    amount: number;
  }
  const [placeBets, setPlaceBets] = useState<PlaceBet[]>([]);
  const [buyBets, setBuyBets] = useState<PlaceBet[]>([]);

  interface TableDisplayState {
    passLineBet: number
    dontPassBet: number
    fieldBet: number
    placeBets: { id: string, number: number, amount: number }[]
    buyBets: { id: string, number: number, amount: number }[]
    comeBets: { id: string, point: number | null, amount: number, isUnlocked?: boolean }[]
    dontComeBets: { id: string, point: number | null, amount: number, isUnlocked?: boolean }[]
    passOddsBet: number
    dontPassOddsBet: number
    phase: 'come-out' | 'point'
    point: number | null
    puckIsOn: boolean
    shooterBalance: number
    shooterBet: number
    lastWin: number
    lastRollDie1: number | null
    lastRollDie2: number | null
  }

  const [displayState, setDisplayState] = useState<TableDisplayState>({
    passLineBet: 0,
    dontPassBet: 0,
    fieldBet: 0,
    placeBets: [],
    buyBets: [],
    comeBets: [],
    dontComeBets: [],
    passOddsBet: 0,
    dontPassOddsBet: 0,
    phase: 'come-out',
    point: null,
    puckIsOn: false,
    shooterBalance: 100,
    shooterBet: 0,
    lastWin: 0,
    lastRollDie1: null,
    lastRollDie2: null
  });

  useEffect(() => {
    if (!isShooter) return;
    setDisplayState({
      passLineBet, dontPassBet, fieldBet, placeBets, buyBets, comeBets, dontComeBets,
      passOddsBet: 0, dontPassOddsBet: 0,
      phase, point, puckIsOn: phase === 'point' && point !== null,
      shooterBalance: balance, shooterBet: totalBets, lastWin,
      lastRollDie1: die1, lastRollDie2: die2
    });
  }, [isShooter, passLineBet, dontPassBet, fieldBet, placeBets, buyBets, comeBets, dontComeBets, phase, point, balance, totalBets, lastWin, die1, die2]);

  const handleComeClick = () => {
    if (phase !== 'point') {
      setShakeZone('come');
      setTimeout(() => setShakeZone(null), 400);
      return;
    }
    if (selectedChip) {
      if (balance >= selectedChip) {
        setBalance(b => b - selectedChip);
        setTotalBets(t => t + selectedChip);
        setComeBets(prev => {
          const sum = prev.reduce((acc, curr) => curr.point === null ? acc + curr.amount : acc, 0) + selectedChip;
          syncBetToSupabase({ betType: 'come', amount: sum, status: 'active', point: null });
          return [...prev, { id: Math.random().toString(36).substr(2, 9), amount: selectedChip, point: null }];
        });
      } else {
        setShakeZone('chip-' + selectedChip);
        setShowLowFundsToast(true);
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handleDontComeClick = () => {
    if (phase !== 'point') {
      setShakeZone('dontcome');
      setTimeout(() => setShakeZone(null), 400);
      return;
    }
    if (selectedChip) {
      if (balance >= selectedChip) {
        setBalance(b => b - selectedChip);
        setTotalBets(t => t + selectedChip);
        setDontComeBets(prev => {
          const sum = prev.reduce((acc, curr) => curr.point === null ? acc + curr.amount : acc, 0) + selectedChip;
          syncBetToSupabase({ betType: 'dont-come', amount: sum, status: 'active', point: null });
          return [...prev, { id: Math.random().toString(36).substr(2, 9), amount: selectedChip, point: null }];
        });
      } else {
        setShakeZone('chip-' + selectedChip);
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handlePassLineClick = () => {
    console.log('Pass Line clicked, chip value:', selectedChip, 'isShooter:', isShooter);
    if (phase !== 'come-out') {
      setShakeZone('passline');
      setTimeout(() => setShakeZone(null), 400);
      return;
    }
    if (dontPassBet > 0) {
      setShakeZone('passline');
      setTooltip({zone: 'passline', msg: "Remove Don't Pass bet first"});
      setTimeout(() => {
        setShakeZone(null);
        setTooltip(null);
      }, 1500);
      return;
    }
    if (selectedChip) {
      if (balance >= selectedChip) {
        const newAmount = passLineBet + selectedChip;
        setBalance(b => b - selectedChip);
        setPassLineBet(newAmount);
        setTotalBets(t => t + selectedChip);
        syncBetToSupabase({ betType: 'pass-line', amount: newAmount, status: 'active', point: null });
      } else {
        setShakeZone('chip-' + selectedChip);
        setShowLowFundsToast(true);
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handleDontPassClick = () => {
    if (phase !== 'come-out') {
      setShakeZone('dontpass');
      setTimeout(() => setShakeZone(null), 400);
      return;
    }
    if (passLineBet > 0) {
      setShakeZone('dontpass');
      setTooltip({zone: 'dontpass', msg: "Remove Pass Line bet first"});
      setTimeout(() => {
        setShakeZone(null);
        setTooltip(null);
      }, 1500);
      return;
    }
    if (selectedChip) {
      if (balance >= selectedChip) {
        const newAmount = dontPassBet + selectedChip;
        setBalance(b => b - selectedChip);
        setDontPassBet(newAmount);
        setTotalBets(t => t + selectedChip);
        syncBetToSupabase({ betType: 'dont-pass', amount: newAmount, status: 'active', point: null });
      } else {
        setShakeZone('chip-' + selectedChip);
        setShowLowFundsToast(true);
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handleFieldClick = () => {
    if (selectedChip) {
      if (balance >= selectedChip) {
        const newAmount = fieldBet + selectedChip;
        setBalance(b => b - selectedChip);
        setTotalBets(t => t + selectedChip);
        setFieldBet(newAmount);
        syncBetToSupabase({ betType: 'field', amount: newAmount, status: 'active', point: null });
      } else {
        setShakeZone('field');
        setShowLowFundsToast(true);
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handlePlaceClick = (number: number) => {
    if (phase !== 'point') return;
    setPlaceBets(prev => {
      const existing = prev.find(b => b.number === number);
      
      if (!existing || existing.amount === 0) {
        if (!selectedChip) return prev;
        if (balance < selectedChip) {
          setShakeZone('chip-' + selectedChip);
          setShowLowFundsToast(true);
          setTimeout(() => setShakeZone(null), 400);
          return prev;
        }
        const newBet = { id: Math.random().toString(36).substr(2, 9), number, amount: selectedChip };
        setBalance(b => b - selectedChip);
        setTotalBets(t => t + selectedChip);
        syncBetToSupabase({ betType: `place-${number}`, amount: selectedChip, status: 'active', point: null });
        return [...prev.filter(b => b.number !== number), newBet];
      } else {
        setBalance(b => b + existing.amount);
        setTotalBets(t => Math.max(0, t - existing.amount));
        removeBetFromSupabase(`place-${number}`);
        return prev.filter(b => b.number !== number);
      }
    });
  };

  const handleBuyClick = (number: number) => {
    if (phase !== 'point') return;
    if (![4, 5, 6, 8, 9, 10].includes(number)) {
      setShakeZone(`buy-${number}`);
      setTooltip({ zone: `buy-${number}`, msg: 'Buy bets only available on 4, 5, 6, 8, 9, 10' });
      setTimeout(() => setShakeZone(null), 400);
      setTimeout(() => setTooltip(null), 2000);
      return;
    }
    setBuyBets(prev => {
      const existing = prev.find(b => b.number === number);
      
      if (!existing || existing.amount === 0) {
        if (!selectedChip) return prev;
        if (balance < selectedChip) {
          setShakeZone('chip-' + selectedChip);
          setShowLowFundsToast(true);
          setTimeout(() => setShakeZone(null), 400);
          return prev;
        }
        const newBet = { id: Math.random().toString(36).substr(2, 9), number, amount: selectedChip };
        setBalance(b => b - selectedChip);
        setTotalBets(t => t + selectedChip);
        syncBetToSupabase({ betType: `buy-${number}`, amount: selectedChip, status: 'active', point: null });
        return [...prev.filter(b => b.number !== number), newBet];
      } else {
        setBalance(b => b + existing.amount);
        setTotalBets(t => Math.max(0, t - existing.amount));
        removeBetFromSupabase(`buy-${number}`);
        return prev.filter(b => b.number !== number);
      }
    });
  };

  const removePassLineBet = async () => {
    setBalance(b => b + passLineBet);
    setTotalBets(t => Math.max(0, t - passLineBet));
    setPassLineBet(0);
    setWinPulse(false);
    await removeBetFromSupabase('pass-line');
  };

  const removeDontPassBet = async () => {
    setBalance(b => b + dontPassBet);
    setTotalBets(t => Math.max(0, t - dontPassBet));
    setDontPassBet(0);
    setDpWinPulse(false);
    await removeBetFromSupabase('dont-pass');
  };

  const removeFieldBet = async () => {
    setTotalBets(t => Math.max(0, t - fieldBet));
    setFieldBet(0);
    await removeBetFromSupabase('field');
  };

  const handleClearBets = async () => {
    if (!isShooter || isRolling) return;
    
    let refund = 0;
    
    if (phase === 'come-out') {
      if (passLineBet > 0) { refund += passLineBet; await removeBetFromSupabase('pass-line'); }
      if (dontPassBet > 0) { refund += dontPassBet; await removeBetFromSupabase('dont-pass'); }
      setPassLineBet(0);
      setDontPassBet(0);
    }
    
    if (fieldBet > 0) {
      refund += fieldBet;
      await removeBetFromSupabase('field');
      setFieldBet(0);
    }

    for (const b of placeBets) {
      refund += b.amount;
      await removeBetFromSupabase(`place-${b.number}`);
    }
    setPlaceBets([]);

    for (const b of buyBets) {
      refund += b.amount;
      await removeBetFromSupabase(`buy-${b.number}`);
    }
    setBuyBets([]);
    
    let remainingCome = [...comeBets];
    let remainingDc = [...dontComeBets];
    
    for (const b of remainingCome) {
      if (b.point === null || b.isUnlocked) {
        refund += b.amount;
        await removeBetFromSupabase(b.point === null ? 'come' : `come-${b.point}`);
      }
    }
    remainingCome = remainingCome.filter(b => b.point !== null && !b.isUnlocked);
    
    for (const b of remainingDc) {
      if (b.point === null || b.isUnlocked) {
        refund += b.amount;
        await removeBetFromSupabase(b.point === null ? 'dont-come' : `dont-come-${b.point}`);
      }
    }
    remainingDc = remainingDc.filter(b => b.point !== null && !b.isUnlocked);

    if (refund > 0) {
      setBalance(b => b + refund);
      setTotalBets(t => Math.max(0, t - refund));
      setComeBets(remainingCome);
      setDontComeBets(remainingDc);
      if (phase === 'come-out') {
        setWinPulse(false);
        setDpWinPulse(false);
      }
    } else {
      if (passLineBet > 0 || dontPassBet > 0 || comeBets.length > 0 || dontComeBets.length > 0 || fieldBet > 0 || placeBets.length > 0 || buyBets.length > 0) {
        setShakeZone('clear-bets');
        setTimeout(() => setShakeZone(null), 400);
      }
    }
  };

  const handleRollClick = async () => {
    if (isRolling || (passLineBet === 0 && dontPassBet === 0 && comeBets.length === 0 && dontComeBets.length === 0)) return;
    setDiceResting(false);
    
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const t = d1 + d2;
    setDie1(d1);
    setDie2(d2);
    setTotal(t);

    if (character?.playerId) {
      await supabase
        .from('craps_tables')
        .update({
          last_roll_die1: d1,
          last_roll_die2: d2,
          last_roll_total: t,
          last_updated_by: character.playerId,
          updated_at: new Date().toISOString()
        })
        .eq('code', code);
    }

    setIsRolling(true);
    setIsTumbling(true);

    setTimeout(() => {
      setIsTumbling(false);
    }, 1500);

    setTimeout(() => {
      setIsRolling(false);
      setRestingDie1(d1);
      setRestingDie2(d2);
      setRestingTotal(t);
      setDiceResting(true);
      setPushZone(null);

      // Phase 4 Resolution Logic
      let nextBalance = balance;
      let nextTotalBets = totalBets;
      let newPassLineBet = passLineBet;
      let newDontPassBet = dontPassBet;
      let rollWin = 0;
      let flash: 'green' | 'red' | 'gold' | null = null;
      let msg: string | null = null;
      
      let nextPhase = phase;
      let nextPoint = point;
      const resolvedBets: {betType: string, status: 'won' | 'lost' | 'pushed', payout: number}[] = [];

      if (phase === 'come-out') {
        if (t === 7 || t === 11) {
          if (newPassLineBet > 0) {
            nextBalance += newPassLineBet;
            rollWin += newPassLineBet;
            resolvedBets.push({ betType: 'pass-line', status: 'won', payout: newPassLineBet });
            setWinPulse(true);
            flash = 'gold';
            msg = 'NATURAL! WINNER!';
            postGameEvent(lang === 'en' ? `🎉 Natural! ${character?.displayName} wins!` : `🎉 ¡Natural! ¡${character?.displayName} gana!`);
          } else if (newDontPassBet > 0) {
            nextTotalBets = Math.max(0, nextTotalBets - newDontPassBet);
            resolvedBets.push({ betType: 'dont-pass', status: 'lost', payout: 0 });
            newDontPassBet = 0;
            flash = 'red';
            msg = "NATURAL — DON'T PASS LOSES";
          } else {
            flash = null;
            msg = 'NATURAL!';
          }
        } else if (t === 2 || t === 3) {
          if (newDontPassBet > 0) {
            nextBalance += newDontPassBet;
            rollWin += newDontPassBet;
            resolvedBets.push({ betType: 'dont-pass', status: 'won', payout: newDontPassBet });
            setDpWinPulse(true);
            flash = 'gold';
            msg = 'WINNER!';
            postGameEvent(lang === 'en' ? `🎉 Natural! ${character?.displayName} wins!` : `🎉 ¡Natural! ¡${character?.displayName} gana!`);
          } else if (newPassLineBet > 0) {
            nextTotalBets = Math.max(0, nextTotalBets - newPassLineBet);
            resolvedBets.push({ betType: 'pass-line', status: 'lost', payout: 0 });
            newPassLineBet = 0;
            flash = 'red';
            msg = 'CRAPS — PASS LINE LOSES';
          } else {
            flash = null;
            msg = 'CRAPS!';
          }
        } else if (t === 12) {
          if (newDontPassBet > 0) {
            nextBalance += newDontPassBet;
            nextTotalBets = Math.max(0, nextTotalBets - newDontPassBet);
            resolvedBets.push({ betType: 'dont-pass', status: 'pushed', payout: 0 });
            newDontPassBet = 0;
            setPushZone('dont-pass');
            flash = null;
            msg = 'PUSH';
          } else if (newPassLineBet > 0) {
            nextPhase = 'point';
            nextPoint = 12;
            setPoint(12);
            setPhase('point');
            flash = 'gold';
            msg = 'POINT IS 12';
          } else {
            nextPhase = 'point';
            nextPoint = 12;
            setPoint(12);
            setPhase('point');
            flash = null;
            msg = 'POINT IS 12';
          }
        } else {
          nextPhase = 'point';
          nextPoint = t;
          setPoint(t);
          setPhase('point');
          flash = 'gold';
          msg = `POINT IS ${t}`;
          postGameEvent(lang === 'en' ? `🎯 Point is ${t}! Can ${character?.displayName} make it?` : `🎯 ¡El punto es ${t}! ¿Puede ${character?.displayName} lograrlo?`);
        }
      } else if (phase === 'point') {
        // --- Point Hit ---
        if (t === point) {
          nextPhase = 'come-out';
          nextPoint = null;
          setPhase('come-out');
          setPoint(null);
          
          if (newPassLineBet > 0) {
            nextBalance += newPassLineBet;
            rollWin += newPassLineBet;
            resolvedBets.push({ betType: 'pass-line', status: 'won', payout: newPassLineBet });
            setWinPulse(true);
            flash = 'gold';
            msg = 'POINT HIT! WINNER!';
            postGameEvent(lang === 'en' ? `🏆 ${character?.displayName} hit the point! Winner!` : `🏆 ¡${character?.displayName} hizo el punto! ¡Ganador!`);
          } else if (newDontPassBet > 0) {
            nextTotalBets = Math.max(0, nextTotalBets - newDontPassBet);
            resolvedBets.push({ betType: 'dont-pass', status: 'lost', payout: 0 });
            newDontPassBet = 0;
            flash = null;
            msg = 'POINT HIT!';
          } else {
            flash = null;
            msg = 'POINT HIT!';
          }
        } 
        // --- Seven Out ---
        else if (t === 7) {
          nextPhase = 'come-out';
          nextPoint = null;
          setPhase('come-out');
          setPoint(null);
          
          if (newDontPassBet > 0) {
            nextBalance += newDontPassBet;
            rollWin += newDontPassBet;
            resolvedBets.push({ betType: 'dont-pass', status: 'won', payout: newDontPassBet });
            setDpWinPulse(true);
            flash = 'gold';
            msg = 'SEVEN OUT! WINNER!';
          } else if (newPassLineBet > 0) {
            nextTotalBets = Math.max(0, nextTotalBets - newPassLineBet);
            resolvedBets.push({ betType: 'pass-line', status: 'lost', payout: 0 });
            newPassLineBet = 0;
            flash = 'red';
            msg = 'SEVEN OUT!';
          } else {
            flash = 'red';
            msg = 'SEVEN OUT!';
          }
        }
      }

      // Phase 4 Part 3: Come and Don't Come Resolution
      let nextComeBets: PointBet[] = [];
      let nextDontComeBets: PointBet[] = [];
      let didComeWin = false;
      let didComeLose = false;
      let didDcWin = false;
      let didDcLose = false;
      let didDcPush = false;
      let opposingComeMsg: string | null = null;
      let opposingDcMsg: string | null = null;

      comeBets.forEach(bet => {
        if (bet.point === null) {
          if (t === 7 || t === 11) {
            nextBalance += bet.amount;
            rollWin += bet.amount;
            didComeWin = true;
            nextComeBets.push({ ...bet, isUnlocked: true });
            resolvedBets.push({ betType: 'come', status: 'won', payout: bet.amount });
          } else if (t === 2 || t === 3 || t === 12) {
            nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
            didComeLose = true;
            resolvedBets.push({ betType: 'come', status: 'lost', payout: 0 });
          } else {
            const hasOpposing = dontComeBets.some(b => b.point === t);
            if (hasOpposing) {
              nextBalance += bet.amount;
              nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
              opposingComeMsg = `Opposing bet already on ${t}`;
              resolvedBets.push({ betType: 'come', status: 'pushed', payout: 0 });
            } else {
              const existingIndex = nextComeBets.findIndex(b => b.point === t && !b.isUnlocked);
              let newAmount = bet.amount;
              if (existingIndex !== -1) {
                newAmount += nextComeBets[existingIndex].amount;
                nextComeBets[existingIndex] = { ...nextComeBets[existingIndex], amount: newAmount };
              } else {
                nextComeBets.push({ ...bet, point: t });
              }
              syncBetToSupabase({ betType: `come-${t}`, amount: newAmount, status: 'active', point: t });
              syncBetToSupabase({ betType: 'come', amount: 0, status: 'cleared', point: null });
            }
          }
        } else {
          if (t === 7) {
            nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
            resolvedBets.push({ betType: `come-${bet.point}`, status: 'lost', payout: 0 });
          } else if (t === bet.point) {
            nextBalance += bet.amount;
            rollWin += bet.amount;
            nextComeBets.push({ ...bet, isUnlocked: true });
            resolvedBets.push({ betType: `come-${bet.point}`, status: 'won', payout: bet.amount });
          } else {
            const existingIndex = nextComeBets.findIndex(b => b.point === bet.point && !b.isUnlocked);
            if (existingIndex !== -1) {
              nextComeBets[existingIndex] = { ...nextComeBets[existingIndex], amount: nextComeBets[existingIndex].amount + bet.amount };
            } else {
              nextComeBets.push({ ...bet });
            }
          }
        }
      });

      dontComeBets.forEach(bet => {
        if (bet.point === null) {
          if (t === 7 || t === 11) {
            nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
            didDcLose = true;
            resolvedBets.push({ betType: 'dont-come', status: 'lost', payout: 0 });
          } else if (t === 2 || t === 3) {
            nextBalance += bet.amount;
            rollWin += bet.amount;
            didDcWin = true;
            nextDontComeBets.push({ ...bet, isUnlocked: true });
            resolvedBets.push({ betType: 'dont-come', status: 'won', payout: bet.amount });
          } else if (t === 12) {
            nextBalance += bet.amount;
            nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
            didDcPush = true;
            resolvedBets.push({ betType: 'dont-come', status: 'pushed', payout: 0 });
          } else {
            const hasOpposing = comeBets.some(b => b.point === t);
            if (hasOpposing) {
              nextBalance += bet.amount;
              nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
              opposingDcMsg = `Opposing bet already on ${t}`;
              resolvedBets.push({ betType: 'dont-come', status: 'pushed', payout: 0 });
            } else {
              const existingIndex = nextDontComeBets.findIndex(b => b.point === t && !b.isUnlocked);
              let newAmount = bet.amount;
              if (existingIndex !== -1) {
                newAmount += nextDontComeBets[existingIndex].amount;
                nextDontComeBets[existingIndex] = { ...nextDontComeBets[existingIndex], amount: newAmount };
              } else {
                nextDontComeBets.push({ ...bet, point: t });
              }
              syncBetToSupabase({ betType: `dont-come-${t}`, amount: newAmount, status: 'active', point: t });
              syncBetToSupabase({ betType: 'dont-come', amount: 0, status: 'cleared', point: null });
            }
          }
        } else {
          if (t === 7) {
            nextBalance += bet.amount;
            rollWin += bet.amount;
            nextDontComeBets.push({ ...bet, isUnlocked: true });
            resolvedBets.push({ betType: `dont-come-${bet.point}`, status: 'won', payout: bet.amount });
          } else if (t === bet.point) {
            nextTotalBets = Math.max(0, nextTotalBets - bet.amount);
            resolvedBets.push({ betType: `dont-come-${bet.point}`, status: 'lost', payout: 0 });
          } else {
            const existingIndex = nextDontComeBets.findIndex(b => b.point === bet.point && !b.isUnlocked);
            if (existingIndex !== -1) {
              nextDontComeBets[existingIndex] = { ...nextDontComeBets[existingIndex], amount: nextDontComeBets[existingIndex].amount + bet.amount };
            } else {
              nextDontComeBets.push({ ...bet });
            }
          }
        }
      });

      setComeBets(nextComeBets);
      setDontComeBets(nextDontComeBets);

      if (opposingComeMsg) setComeFlash(opposingComeMsg);
      else if (didComeWin) setComeFlash('COME BET WINS');
      else if (didComeLose) setComeFlash('COME BET LOSES');
      
      if (opposingDcMsg) setDcFlash(opposingDcMsg);
      else if (didDcWin) setDcFlash("DON'T COME WINS");
      else if (didDcLose) setDcFlash("DON'T COME LOSES");
      else if (didDcPush) setDcFlash('PUSH');

      // Phase 5 Resolution: Field, Place, Buy
      let newFieldBet = fieldBet;
      if (newFieldBet > 0) {
        if ([3, 4, 9, 10, 11].includes(t)) {
          nextBalance += newFieldBet * 2;
          nextTotalBets = Math.max(0, nextTotalBets - newFieldBet);
          rollWin += newFieldBet;
          resolvedBets.push({ betType: 'field', status: 'won', payout: newFieldBet });
          setFieldFlash('FIELD WINS');
        } else if (t === 2 || t === 12) {
          nextBalance += newFieldBet * 3;
          nextTotalBets = Math.max(0, nextTotalBets - newFieldBet);
          rollWin += newFieldBet * 2;
          resolvedBets.push({ betType: 'field', status: 'won', payout: newFieldBet * 2 });
          setFieldFlash('FIELD WINS');
        } else {
          nextTotalBets = Math.max(0, nextTotalBets - newFieldBet);
          resolvedBets.push({ betType: 'field', status: 'lost', payout: 0 });
          setFieldFlash('FIELD LOSES');
        }
        newFieldBet = 0;
      } else {
        setFieldFlash(null);
      }
      setFieldBet(newFieldBet);

      let nextPlaceBets = [...placeBets];
      if (phase === 'point') {
        if (t === 7) {
          nextPlaceBets.forEach(b => {
            nextTotalBets = Math.max(0, nextTotalBets - b.amount);
            resolvedBets.push({ betType: `place-${b.number}`, status: 'lost', payout: 0 });
          });
          nextPlaceBets = [];
        } else if ([4, 5, 6, 8, 9, 10].includes(t)) {
          nextPlaceBets.forEach(b => {
            if (b.number === t) {
              const [num, den] = PLACE_PAYOUTS[t];
              const winAmount = (b.amount * num) / den;
              nextBalance += winAmount;
              rollWin += winAmount;
              resolvedBets.push({ betType: `place-${b.number}`, status: 'won', payout: winAmount });
            }
          });
        }
      }
      setPlaceBets(nextPlaceBets);

      let nextBuyBets = [...buyBets];
      if (phase === 'point') {
        if (t === 7) {
          nextBuyBets.forEach(b => {
            nextTotalBets = Math.max(0, nextTotalBets - b.amount);
            resolvedBets.push({ betType: `buy-${b.number}`, status: 'lost', payout: 0 });
          });
          nextBuyBets = [];
        } else if (BUY_PAYOUTS[t]) {
          nextBuyBets.forEach(b => {
            if (b.number === t) {
              const [num, den] = BUY_PAYOUTS[t];
              const winAmount = (b.amount * num) / den;
              const vig = b.amount * 0.05;
              const netWin = winAmount - vig;
              nextBalance += netWin;
              rollWin += netWin;
              resolvedBets.push({ betType: `buy-${b.number}`, status: 'won', payout: netWin });
            }
          });
        }
      }
      setBuyBets(nextBuyBets);

      setTimeout(() => {
        setComeFlash(null);
        setDcFlash(null);
        setFieldFlash(null);
      }, 2000);

      setBalance(nextBalance);
      setTotalBets(nextTotalBets);
      
      if (rollWin > 50) {
        postGameEvent(lang === 'en' ? `🔥 Big win! ${character?.displayName} just won $${rollWin.toFixed(2)}!` : `🔥 ¡Gran ganancia! ¡${character?.displayName} ganó $${rollWin.toFixed(2)}!`);
      }
      setLastWin(rollWin);
      
      setPassLineBet(newPassLineBet);
      setDontPassBet(newDontPassBet);
      if (flash) setTableFlash(flash);
      if (msg) setBannerMsg(msg);

      if (msg || pushZone) {
         setTimeout(() => {
           setTableFlash(null);
           setBannerMsg(null);
           setWinPulse(false);
           setDpWinPulse(false);
           setPushZone(null);
         }, 2000);
      }
      
      syncBetResolution(resolvedBets);
      
      if (rollWin > 0) {
        supabase.from('craps_tables').update({ last_win: rollWin }).eq('code', code).then();
      }
      
      syncRollToSupabase(nextPhase, nextPoint, nextBalance);
    }, 2500);
  };

  const syncRollToSupabase = async (
    newPhase: string,
    newPoint: number | null,
    newBalance: number
  ) => {
    if (!character?.playerId) return;
    
    await supabase
      .from('craps_tables')
      .update({
        phase: newPhase,
        point: newPoint,
        last_updated_by: character.playerId,
        updated_at: new Date().toISOString()
      })
      .eq('code', code);
      
    await supabase
      .from('craps_players')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('table_code', code)
      .eq('player_id', character.playerId);
  };

  const getTotalColor = (t: number | null) => {
    if (!t) return 'text-white';
    if (t === 7 || t === 11) return 'text-green-500';
    if (t === 2 || t === 3 || t === 12) return 'text-red-500';
    return 'text-yellow-400';
  };

  const connectedPlayers = players.filter(p => p.is_connected);
  const closeFriendsCount = connectedPlayers.filter(p => Number(p.tier) === 1).length;
  const friendsCount = connectedPlayers.filter(p => Number(p.tier) === 2).length;
  const guestsCount = connectedPlayers.filter(p => Number(p.tier) === 3).length;

  const tablePlayers = players.filter(p => Number(p.tier) === 1);
  const railPlayers = players.filter(p => Number(p.tier) === 2 || Number(p.tier) === 3);

  const handleCopyInvite = (access: string) => {
    const url = `${window.location.origin}/table/${code}${access === 'guest' ? '' : `?access=${access}`}`;
    navigator.clipboard.writeText(url);
    setShowInviteMenu(false);
    const msg = lang === 'en' ? 'Copied!' : '¡Copiado!';
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2000);
  };

  const handleLeaveTable = async () => {
    await supabase.from('craps_players').delete().eq('table_code', code).eq('player_id', character?.playerId);
    router.push('/');
  };

  const getTableSlots = () => {
    const slots: (Player | null)[] = [null, null, null, null, null, null];
    const t1 = [...tablePlayers].sort((a, b) => (a.seat_number || 0) - (b.seat_number || 0));
    let remainingToPlace = [...t1];
    
    const localTier1 = t1.find(p => p.player_id === character?.playerId);
    if (localTier1) {
      slots[0] = localTier1;
      remainingToPlace = remainingToPlace.filter(p => p.player_id !== localTier1.player_id);
    }
    
    const shooterId = room?.current_shooter_id;
    const shooterTier1 = remainingToPlace.find(p => p.player_id === shooterId);
    if (shooterTier1) {
      slots[3] = shooterTier1;
      remainingToPlace = remainingToPlace.filter(p => p.player_id !== shooterTier1.player_id);
    }
    
    const availableSlots = [1, 2, 4, 5, 0, 3].filter(i => slots[i] === null);
    remainingToPlace.forEach((p, index) => {
      if (index < availableSlots.length) {
        slots[availableSlots[index]] = p;
      }
    });
    return slots;
  };

  const tableSlots = getTableSlots();

  const renderTableSlot = (player: Player | null, index: number) => {
    const positionClasses = [
      "-bottom-10 left-1/2 -translate-x-1/2", // 0: bottom-center
      "-left-10 top-1/2 -translate-y-1/2", // 1: left-center
      "-top-10 left-[20%] -translate-x-1/2", // 2: top-left
      "-top-10 left-1/2 -translate-x-1/2", // 3: top-center
      "-top-10 right-[20%] translate-x-1/2", // 4: top-right
      "-right-10 top-1/2 -translate-y-1/2", // 5: right-center
    ];

    if (!player) {
      return null;
    }

    const positions: ('bottom' | 'left' | 'top' | 'top' | 'top' | 'right')[] = ['bottom', 'left', 'top', 'top', 'top', 'right'];

    const speechBubble = speechBubbles.find(b => b.playerId === player.player_id);
    let bubblePositionClass = "-top-12 left-1/2 -translate-x-1/2"; // default top
    
    if (index === 1) bubblePositionClass = "-right-[110%] top-1/2 -translate-y-1/2";
    else if (index === 5) bubblePositionClass = "-left-[110%] top-1/2 -translate-y-1/2";

    return (
      <div key={`slot-${index}`} className={`absolute ${positionClasses[index]} z-30`}>
        {speechBubble && (
          <div className={`absolute ${bubblePositionClass} bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap z-50 flex items-center animate-overlay-in`}>
            {speechBubble.message.length > 40 ? speechBubble.message.substring(0, 40) + '...' : speechBubble.message}
            <div className={`absolute w-2 h-2 bg-white transform rotate-45 ${
              index === 1 ? '-left-1 top-1/2 -translate-y-1/2' :
              index === 5 ? '-right-1 top-1/2 -translate-y-1/2' :
              '-bottom-1 left-1/2 -translate-x-1/2'
            }`} />
          </div>
        )}
        <LiveTableAvatar 
          player={player} 
          isShooter={player.player_id === room?.current_shooter_id} 
          isLocal={player.player_id === character?.playerId} 
          size="large" 
          lang={lang} 
          position={positions[index]}
        />
      </div>
    );
  };

  const isPuckOn = displayState.puckIsOn;
  const renderPuckNumber = displayState.point;

  useEffect(() => {
    if (!isShooter || !code) return;
    supabase
      .from('craps_tables')
      .update({
        shooter_balance: balance,
        shooter_total_bet: totalBets,
      })
      .eq('code', code);
  }, [balance, totalBets, isShooter, code]);

  const MainContent = (
    <div className="flex flex-col h-screen bg-black text-white select-none font-sans overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 bg-[#111] flex justify-between items-center px-6 border-b border-black shrink-0 z-10 w-full">
        {/* Left Section */}
        <div className="flex items-center gap-4 flex-1">
          {isShooter ? (
            <>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Credit: <span className="text-white">${balance.toFixed(2)}</span>
              </div>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Bet: <span className="text-white">${Math.max(0, totalBets).toFixed(2)}</span>
              </div>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Last Win: <span className={lastWin > 0 ? "text-yellow-400" : "text-white"}>${lastWin.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Shooter: <span className="text-white">{players.find(p => p.player_id === room?.current_shooter_id)?.display_name || 'Unknown'}</span>
              </div>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Credit: <span className="text-white">${displayState.shooterBalance.toFixed(2)}</span>
              </div>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Bet: <span className="text-white">${displayState.shooterBet.toFixed(2)}</span>
              </div>
              <div className="bg-black/50 px-4 py-2 rounded text-lg text-gray-400 font-medium whitespace-nowrap">
                Last Win: <span className={displayState.lastWin > 0 ? "text-yellow-400" : "text-white"}>${displayState.lastWin.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Center Section */}
        <div className="flex items-center justify-center flex-1">
          <div className="relative flex items-center justify-center">
            <div className="absolute right-full mr-6 text-gray-400 font-bold text-[10px] tracking-widest whitespace-nowrap top-1/2 -translate-y-1/2 pt-1">
              {lang === 'en' 
                ? `👥 ${friendsCount} on the rail • 👁 ${guestsCount} watching`
                : `👥 ${friendsCount} en la baranda • 👁 ${guestsCount} mirando`}
            </div>
            
            <h1 className="text-2xl font-black tracking-[0.2em] text-white/90 pointer-events-none whitespace-nowrap leading-none pt-1">
              SOCIAL CRAPS
            </h1>
            
            <div className="absolute left-full ml-6 text-[10px] text-yellow-400 tracking-widest font-bold whitespace-nowrap top-1/2 -translate-y-1/2 pt-1">
              ROOM: {code}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center justify-end gap-4 flex-1">
          <div className="relative">
            <button onClick={() => setShowInviteMenu(!showInviteMenu)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm font-bold shadow transition-colors">
              {lang === 'en' ? 'Invite' : 'Invitar'}
            </button>
            {showInviteMenu && (
              <div className="absolute top-full mt-2 right-0 w-72 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <button 
                  onClick={() => handleCopyInvite('closefriend')}
                  className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 transition-colors"
                >
                  <div className="font-bold text-sm text-yellow-400">{lang === 'en' ? 'Invite to Table' : 'Invitar a la Mesa'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{lang === 'en' ? 'Voice chat + heatmap + ride with me' : 'Voz + mapa de calor + acompañar'}</div>
                </button>
                <button 
                  onClick={() => handleCopyInvite('friend')}
                  className="w-full text-left p-3 hover:bg-white/5 border-b border-white/5 transition-colors"
                >
                  <div className="font-bold text-sm text-green-400">{lang === 'en' ? 'Invite to Rail' : 'Invitar a la Baranda'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{lang === 'en' ? 'Heatmap + ride with me + chat' : 'Mapa de calor + acompañar + chat'}</div>
                </button>
                <button 
                  onClick={() => handleCopyInvite('guest')}
                  className="w-full text-left p-3 hover:bg-white/5 transition-colors"
                >
                  <div className="font-bold text-sm text-gray-300">{lang === 'en' ? 'Share' : 'Compartir'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{lang === 'en' ? 'Watch, chat, and ride with me' : 'Ver, chatear y acompañar'}</div>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowLeaveModal(true)} className="bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-1.5 rounded text-sm font-bold shadow transition-colors border border-red-900/50">
            {lang === 'en' ? 'Leave' : 'Salir'}
          </button>
          {character && (
            <div className="flex items-center gap-3 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
              <div className="flex flex-col items-end leading-tight">
                <span className="font-bold text-sm tracking-wide">{character.displayName}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wider ${
                  isShooter ? 'bg-yellow-500 text-black' : 
                  localTier === 1 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50' :
                  localTier === 2 ? 'bg-green-600/20 text-green-400 border border-green-500/50' :
                  'bg-gray-600 text-white'
                }`}>
                  {isShooter ? (lang === 'en' ? 'YOU ARE SHOOTING' : 'ESTÁS TIRANDO') : 
                   localTier === 1 ? (lang === 'en' ? 'AT THE TABLE' : 'EN LA MESA') :
                   localTier === 2 ? (lang === 'en' ? 'RAIL' : 'BARANDA') :
                   (lang === 'en' ? 'WATCHING' : 'MIRANDO')}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 bg-black" style={{ borderColor: character.borderColor }}>
                {character.avatar}
              </div>
            </div>
          )}
          <button onClick={toggleLang} className="bg-gray-200 hover:bg-white text-black px-4 py-1.5 rounded text-sm font-bold shadow transition-colors">
            {lang === 'en' ? 'EN / ES' : 'ES / EN'}
          </button>
        </div>
      </div>

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-8 max-w-sm w-full text-center shadow-2xl animate-overlay-in">
            <h2 className="text-xl font-bold text-white mb-6">
              {lang === 'en' ? 'Are you sure you want to leave?' : '¿Seguro que quieres salir?'}
            </h2>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleLeaveTable}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded font-bold transition-colors"
              >
                {lang === 'en' ? 'Leave' : 'Salir'}
              </button>
              <button 
                onClick={() => setShowLeaveModal(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded font-bold transition-colors"
              >
                {lang === 'en' ? 'Stay' : 'Quedarse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connection Toasts */}
      <div className="absolute top-20 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-black/80 border border-white/10 text-white px-4 py-2 rounded-lg font-bold shadow-xl animate-overlay-in text-sm backdrop-blur-sm">
            {t.msg}
          </div>
        ))}
      </div>

      {/* Low Funds Toast */}
      {showLowFundsToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black border border-red-500 rounded-lg p-3 z-50 flex items-center gap-4 shadow-2xl animate-overlay-in">
          <span className="text-white font-bold text-sm">Insufficient funds — Add $100?</span>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setBalance(b => b + 100);
                setShowLowFundsToast(false);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded text-xs"
            >
              Add Funds
            </button>
            <button 
              onClick={() => setShowLowFundsToast(false)}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Table Flash Overlay */}
      {tableFlash && (
        <div className={`absolute inset-0 z-40 pointer-events-none transition-colors duration-300 ${tableFlash === 'green' ? 'bg-green-500/40' : tableFlash === 'red' ? 'bg-red-600/50' : 'bg-yellow-500/40'}`} />
      )}
      
      {/* Banner Message */}
      {bannerMsg && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center animate-overlay-in">
           <div className="text-6xl md:text-8xl font-black text-white tracking-widest drop-shadow-[0_10px_20px_rgba(0,0,0,1)] text-center">
             {bannerMsg}
           </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col relative min-h-0">
        <div className="flex-1 flex flex-col pt-[80px] pb-[120px] px-[60px] bg-black relative items-center justify-center">
          {/* Main Table Felt */}
          <main className={`w-full max-h-[75vh] flex-1 bg-[#1a5c2a] rounded-[2.5rem] border-[6px] border-[#3a2212] flex p-6 gap-6 relative shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] ${!isShooter ? 'pointer-events-none' : ''}`}>
            
            {/* Avatars */}
            {tableSlots.map((p, i) => renderTableSlot(p, i))}

            {/* Left Panel */}
            <div className="w-[220px] flex flex-col gap-4 shrink-0 relative z-10">
          {/* Hardways */}
          <div className="bg-[#11401d] rounded-lg p-2 border-2 border-white/10 flex flex-col gap-2">
            <div className="text-center font-bold text-sm py-1 border-b border-white/10 text-white/80 tracking-wider">HARDWAYS</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex flex-col items-center gap-1 transition-all">
                 <div className="flex gap-1">
                   <Dice value={2} /> <Dice value={2} />
                 </div>
                 <div className="text-yellow-400 text-[10px] font-bold">10 FOR 1</div>
              </div>
              <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex flex-col items-center gap-1 transition-all">
                 <div className="flex gap-1">
                   <Dice value={3} /> <Dice value={3} />
                 </div>
                 <div className="text-yellow-400 text-[10px] font-bold">10 FOR 1</div>
              </div>
              <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex flex-col items-center gap-1 transition-all">
                 <div className="flex gap-1">
                   <Dice value={4} /> <Dice value={4} />
                 </div>
                 <div className="text-yellow-400 text-[10px] font-bold">8 FOR 1</div>
              </div>
              <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex flex-col items-center gap-1 transition-all">
                 <div className="flex gap-1">
                   <Dice value={5} /> <Dice value={5} />
                 </div>
                 <div className="text-yellow-400 text-[10px] font-bold">8 FOR 1</div>
              </div>
            </div>
          </div>

          {/* One Roll Bets */}
          <div className="bg-[#11401d] rounded-lg p-2 border-2 border-white/10 flex flex-col gap-2 flex-1">
            <div className="text-center font-bold text-sm py-1 border-b border-white/10 text-white/80 tracking-wider">ONE ROLL BETS</div>
            
            <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex justify-between items-center text-red-500 font-bold transition-all mt-1">
              <span className="text-yellow-400 text-[10px] font-normal">5 FOR 1</span>
              <span className="text-lg tracking-widest">SEVEN</span>
              <span className="text-yellow-400 text-[10px] font-normal">5 FOR 1</span>
            </div>

            <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex flex-col items-center gap-2 transition-all">
              <div className="flex justify-between w-full px-2">
                 <div className="flex gap-1"><Dice value={1}/><Dice value={2}/></div>
                 <div className="flex gap-1"><Dice value={1}/><Dice value={1}/></div>
              </div>
              <div className="font-bold text-base tracking-wider text-white">HORN BET</div>
              <div className="flex justify-between w-full px-2">
                 <div className="flex gap-1"><Dice value={6}/><Dice value={6}/></div>
                 <div className="flex gap-1"><Dice value={5}/><Dice value={6}/></div>
              </div>
            </div>

            <div className="bg-[#0a2e13] border border-white/20 rounded hover:brightness-110 cursor-pointer p-2 flex justify-between items-center text-red-500 font-bold transition-all">
              <span className="text-yellow-400 text-[10px] font-normal">8 FOR 1</span>
              <span className="text-sm tracking-wider">ANY CRAPS</span>
              <span className="text-yellow-400 text-[10px] font-normal">8 FOR 1</span>
            </div>

            <div className="flex gap-4 justify-center mt-auto pb-2">
               <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center font-bold hover:brightness-110 bg-[#0a2e13] cursor-pointer text-sm text-white transition-all shadow-md">C&E</div>
               <div className="w-12 h-12 rounded-full border-2 border-white/40 flex items-center justify-center font-bold hover:brightness-110 bg-[#0a2e13] cursor-pointer text-xl text-white transition-all shadow-md">E</div>
            </div>
          </div>
        </div>

        {/* Center/Right Panel */}
        <div className="flex-1 flex flex-col gap-4 relative">
          <div className="text-center font-bold tracking-[0.5em] text-white/50 text-sm">PASS LINE POINT</div>
          {phase === 'point' && point !== null && (
            <div className="text-center font-black tracking-widest text-yellow-400 text-lg -mt-4">Point: {point}</div>
          )}

          {/* OFF Puck */}
          <div className={`absolute top-0 ${!isPuckOn ? 'right-4' : 'hidden'} w-12 h-12 rounded-full border-[3px] border-gray-800 bg-gray-200 flex items-center justify-center font-black text-black shadow-lg z-20`}>
            OFF
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-10 border-[3px] border-white/30 rounded-lg overflow-hidden bg-[#0a2e13] shrink-0 mt-2">
            {[
              {num: '2', place: '13 FOR 2', val: 2}, {num: '3', place: '15 FOR 4', val: 3}, {num: '4', place: '14 FOR 5', val: 4}, {num: '5', place: '12 FOR 5', val: 5}, {num: 'SIX', place: '13 FOR 6', val: 6},
              {num: '8', place: '13 FOR 6', val: 8}, {num: 'NINE', place: '12 FOR 5', val: 9}, {num: '10', place: '14 FOR 5', val: 10}, {num: '11', place: '15 FOR 4', val: 11}, {num: '12', place: '13 FOR 2', val: 12}
            ].map((col, i) => (
              <div key={i} onClick={() => handlePlaceClick(col.val)} className={`flex flex-col border-r-2 border-white/10 last:border-r-0 hover:brightness-110 cursor-pointer relative group transition-all`}>
                {isPuckOn && renderPuckNumber === col.val && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-[3px] border-yellow-400 bg-white flex flex-col items-center justify-center font-black text-black shadow-xl z-20 leading-none">
                     <span className="text-[10px]">ON</span>
                     <span className="text-lg">{renderPuckNumber}</span>
                  </div>
                )}
                <div onClick={(e) => { e.stopPropagation(); handleBuyClick(col.val); }} className={`text-center text-[10px] py-1 border-b-2 border-white/10 text-white/70 font-bold hover:bg-white hover:text-black group-hover:text-white transition-all ${shakeZone === 'buy-'+col.val ? 'animate-[shake_0.2s_ease-in-out_2] bg-red-500 text-white' : ''}`}>BUY</div>
                <div className="flex-1 flex items-center justify-center text-4xl font-black py-4 text-white drop-shadow-md relative">
                  {col.num}
                  {/* Come / Don't Come Traveling Chips */}
                  {/* Traveled Come Bets (Bottom Right) */}
                  <div className="absolute bottom-1 right-1 flex flex-col-reverse gap-0.5 z-10 pointer-events-none items-end">
                     {displayState.comeBets.filter(b => b.point === col.val).map((bet) => (
                        <div key={bet.id} onClick={(e) => {
                             e.stopPropagation();
                             if (bet.isUnlocked) {
                               setBalance(b => b + bet.amount);
                               setTotalBets(t => Math.max(0, t - bet.amount));
                               setComeBets(prev => prev.filter(p => p.id !== bet.id));
                               removeBetFromSupabase(`come-${col.val}`);
                             } else {
                               setShakeZone(`chip-${bet.id}`);
                               setTimeout(() => setShakeZone(null), 400);
                             }
                        }} className={`pointer-events-auto flex items-center gap-1 bg-orange-500 border border-white/50 rounded-full px-1.5 py-0.5 shadow-lg ${bet.isUnlocked ? 'animate-pulse-gold ring-2 ring-yellow-400 cursor-pointer hover:-translate-y-0.5' : ''} ${shakeZone === 'chip-'+bet.id ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}>
                           <span className="text-[7px] font-black text-orange-900 bg-white/90 rounded-full w-3 h-3 flex items-center justify-center">C</span>
                           <span className="text-[9px] font-bold text-white pr-0.5">${bet.amount}</span>
                        </div>
                     ))}
                  </div>

                  {/* Traveled Don't Come Bets (Bottom Left) */}
                  <div className="absolute bottom-1 left-1 flex flex-col-reverse gap-0.5 z-10 pointer-events-none items-start">
                     {displayState.dontComeBets.filter(b => b.point === col.val).map((bet) => (
                        <div key={bet.id} onClick={(e) => {
                             e.stopPropagation();
                             if (bet.isUnlocked) {
                               setBalance(b => b + bet.amount);
                               setTotalBets(t => Math.max(0, t - bet.amount));
                               setDontComeBets(prev => prev.filter(p => p.id !== bet.id));
                               removeBetFromSupabase(`dont-come-${col.val}`);
                             } else {
                               setShakeZone(`chip-${bet.id}`);
                               setTimeout(() => setShakeZone(null), 400);
                             }
                        }} className={`pointer-events-auto flex items-center gap-1 bg-rose-600 border border-white/50 rounded-full px-1.5 py-0.5 shadow-lg ${bet.isUnlocked ? 'animate-pulse-gold ring-2 ring-yellow-400 cursor-pointer hover:-translate-y-0.5' : ''} ${shakeZone === 'chip-'+bet.id ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}>
                           <span className="text-[7px] font-black text-rose-900 bg-white/90 rounded-full w-3.5 h-3.5 flex items-center justify-center">DC</span>
                           <span className="text-[9px] font-bold text-white pr-0.5">${bet.amount}</span>
                        </div>
                     ))}
                  </div>

                  {/* Place Bets (Top Right) */}
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5 z-10 pointer-events-none items-end">
                     {displayState.placeBets.filter(b => b.number === col.val).map((bet) => (
                        <div key={bet.id} onClick={(e) => {
                             e.stopPropagation();
                             handlePlaceClick(col.val);
                        }} className={`pointer-events-auto flex items-center gap-1 bg-blue-600 border border-white/50 rounded-full px-1.5 py-0.5 shadow-lg cursor-pointer hover:-translate-y-0.5 relative`}>
                           <span className="text-[7px] font-black text-blue-900 bg-white/90 rounded-full w-3.5 h-3.5 flex items-center justify-center">P</span>
                           <span className="text-[9px] font-bold text-white pr-0.5">${bet.amount}</span>
                           {!isPuckOn && (
                             <div className="absolute -top-1.5 -right-1.5 bg-black text-white text-[6px] font-black px-1 py-0.5 rounded shadow border border-white/50 z-20">OFF</div>
                           )}
                        </div>
                     ))}
                  </div>

                  {/* Buy Bets (Top Left) */}
                  <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none items-start">
                     {displayState.buyBets.filter(b => b.number === col.val).map((bet) => (
                        <div key={bet.id} onClick={(e) => {
                             e.stopPropagation();
                             handleBuyClick(col.val);
                        }} className={`pointer-events-auto flex items-center gap-1 bg-teal-600 border border-white/50 rounded-full px-1.5 py-0.5 shadow-lg cursor-pointer hover:-translate-y-0.5 relative`}>
                           <span className="text-[7px] font-black text-teal-900 bg-white/90 rounded-full w-3.5 h-3.5 flex items-center justify-center">B</span>
                           <span className="text-[9px] font-bold text-white pr-0.5">${bet.amount}</span>
                           {!isPuckOn && (
                             <div className="absolute -top-1.5 -right-1.5 bg-black text-white text-[6px] font-black px-1 py-0.5 rounded shadow border border-white/50 z-20">OFF</div>
                           )}
                        </div>
                     ))}
                  </div>
                </div>
                <div className="text-center text-[9px] py-1 border-t-2 border-white/10 text-yellow-400 font-bold pointer-events-none">PLACE<br/>{col.place}</div>
              </div>
            ))}
          </div>

          {/* Middle Area */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Left Column (COME & Buttons) */}
            <div className="flex-[0.4] flex gap-3">
              <div className="flex flex-col justify-center gap-4 py-4">
                <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center font-bold hover:brightness-110 bg-[#0a2e13] cursor-pointer text-white shadow-md">C</div>
                <div className="w-10 h-10 rounded-full border-2 border-white/40 flex items-center justify-center font-bold text-xs hover:brightness-110 bg-[#0a2e13] cursor-pointer text-white shadow-md">C&E</div>
              </div>
              <div className="flex flex-col justify-center gap-3 py-4">
                <button className="bg-gray-200 text-black text-[10px] font-bold py-1.5 px-2 rounded hover:bg-white shadow">SET BETS ON</button>
                <button className="bg-[#2a7c3a] text-white text-[10px] font-bold py-1.5 px-2 rounded hover:brightness-110 border border-white/20 shadow">PRESS</button>
                <button className="bg-[#2a7c3a] text-white text-[10px] font-bold py-1.5 px-2 rounded hover:brightness-110 border border-white/20 shadow">ACROSS</button>
              </div>
              <div className="flex-1 flex flex-col gap-2 relative">
                {/* Don't Come */}
                <div onClick={handleDontComeClick} className={`h-8 w-full border-[2px] border-white/20 rounded-lg flex items-center justify-center text-sm font-black text-red-500 tracking-widest hover:brightness-110 cursor-pointer bg-[#0a2e13] transition-all shadow-inner relative z-10 ${shakeZone === 'dontcome' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}>
                   DON'T COME
                   {dcFlash && (
                     <div className={`absolute inset-0 flex items-center justify-center font-black text-xs z-20 rounded animate-overlay-in ${dcFlash.includes('WINS') ? 'bg-yellow-500/80 text-black' : dcFlash === 'PUSH' ? 'bg-yellow-500/80 text-black' : 'bg-black/80 text-white'}`}>
                       {dcFlash}
                     </div>
                   )}
                   {displayState.dontComeBets.filter(b => b.point === null).map((bet, i) => (
                      <div key={bet.id} onClick={(e) => {
                           e.stopPropagation();
                           if (bet.isUnlocked || bet.point === null) {
                             setBalance(b => b + bet.amount);
                             setTotalBets(t => Math.max(0, t - bet.amount));
                             setDontComeBets(prev => prev.filter(p => p.id !== bet.id));
                             removeBetFromSupabase(bet.point === null ? 'dont-come' : `dont-come-${bet.point}`);
                           }
                      }} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full border-[2px] flex items-center justify-center font-black text-[8px] shadow-lg z-10 cursor-pointer hover:-translate-y-0.5 ${getLargestChipColor(bet.amount)} ${bet.isUnlocked ? 'animate-pulse-gold ring-2 ring-yellow-400' : ''}`} style={{ marginLeft: `${i * 12}px` }}>
                         ${bet.amount}
                      </div>
                   ))}
                </div>
                {/* Come */}
                <div onClick={handleComeClick} className={`flex-1 border-[4px] border-[#39ff14] rounded-lg flex items-center justify-center text-4xl xl:text-5xl font-black text-red-500 tracking-widest hover:brightness-110 cursor-pointer bg-[#0a2e13]/40 shadow-[0_0_20px_rgba(57,255,20,0.15)_inset] transition-all relative overflow-hidden z-10 ${shakeZone === 'come' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}>
                  COME
                  {comeFlash && (
                     <div className={`absolute inset-0 flex items-center justify-center font-black text-xl z-20 rounded animate-overlay-in ${comeFlash.includes('WINS') ? 'bg-yellow-500/80 text-black' : 'bg-black/80 text-white'}`}>
                       {comeFlash}
                     </div>
                   )}
                  {displayState.comeBets.filter(b => b.point === null).map((bet, i) => (
                      <div key={bet.id} onClick={(e) => {
                           e.stopPropagation();
                           if (bet.isUnlocked || bet.point === null) {
                             setBalance(b => b + bet.amount);
                             setTotalBets(t => Math.max(0, t - bet.amount));
                             setComeBets(prev => prev.filter(p => p.id !== bet.id));
                             removeBetFromSupabase(bet.point === null ? 'come' : `come-${bet.point}`);
                           }
                      }} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full border-[3px] flex items-center justify-center font-black text-xs shadow-lg z-10 cursor-pointer hover:-translate-y-1 ${getLargestChipColor(bet.amount)} ${bet.isUnlocked ? 'animate-pulse-gold ring-4 ring-yellow-400' : ''}`} style={{ marginTop: `${i * -6}px`, marginLeft: `${i * 6}px` }}>
                         ${bet.amount}
                      </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resting Zone */}
            <div className={`w-[180px] flex flex-col items-center justify-center bg-[#07200c] border border-white/20 rounded-lg shrink-0 transition-opacity duration-500 ${diceResting && restingDie1 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="text-[10px] text-white/50 font-bold mb-3 tracking-widest">LAST ROLL</div>
                <div className="flex items-center gap-3">
                  {restingDie1 && <RestingDice value={restingDie1} />}
                  <span className={`text-4xl font-black ${getTotalColor(restingTotal)}`}>{restingTotal}</span>
                  {restingDie2 && <RestingDice value={restingDie2} />}
                </div>
            </div>

            {/* Right Column (FIELD) */}
            <div onClick={handleFieldClick} className={`flex-[0.6] border-[3px] border-white/30 rounded-lg flex flex-col items-center justify-center hover:brightness-110 cursor-pointer bg-[#0a2e13]/60 transition-all p-4 min-w-0 overflow-hidden relative ${shakeZone === 'field' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}>
               {fieldFlash && (
                 <div className={`absolute inset-0 flex items-center justify-center font-black text-xl z-20 rounded animate-overlay-in ${fieldFlash.includes('WINS') ? 'bg-yellow-500/80 text-black' : 'bg-red-600/80 text-white'}`}>
                   {fieldFlash}
                 </div>
               )}
               <div className="flex items-center justify-center gap-2 xl:gap-8 text-xl lg:text-2xl xl:text-3xl font-bold tracking-widest text-white w-full">
                 <div className="flex flex-col items-center text-xs tracking-normal shrink-0">
                   <span className="text-[10px] text-yellow-400 font-bold">PAYS</span>
                   <span className="border-[3px] border-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-lg lg:text-xl mt-1 mb-1 font-black">2</span>
                   <span className="text-[10px] text-yellow-400 font-bold">DOUBLE</span>
                 </div>
                 <span className="drop-shadow-md whitespace-nowrap shrink">3 • 4 • 9 • 10 • 11</span>
                 <div className="flex flex-col items-center text-xs tracking-normal shrink-0">
                   <span className="text-[10px] text-yellow-400 font-bold">PAYS</span>
                   <span className="border-[3px] border-white rounded-full w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-lg lg:text-xl mt-1 mb-1 font-black">12</span>
                   <span className="text-[10px] text-yellow-400 font-bold">DOUBLE</span>
                 </div>
               </div>
               <div className="text-3xl lg:text-4xl xl:text-5xl font-black mt-2 tracking-widest text-white drop-shadow-lg">FIELD</div>
               {displayState.fieldBet > 0 && (
                 <div 
                    onClick={(e) => {
                       e.stopPropagation();
                       removeFieldBet();
                    }}
                    className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full border-[3px] flex items-center justify-center font-black text-xs shadow-lg z-10 cursor-pointer hover:-translate-y-1 ${getLargestChipColor(displayState.fieldBet)}`}
                 >
                    ${displayState.fieldBet}
                 </div>
               )}
            </div>
          </div>

          <div className="flex flex-col w-full shrink-0 gap-3">
            {/* Don't Pass */}
            <div 
              onClick={handleDontPassClick}
              className={`h-10 w-full border-[3px] ${isPuckOn && displayState.dontPassBet > 0 ? 'border-red-500' : 'border-white/20'} rounded-lg flex items-center justify-center text-xl xl:text-2xl font-black text-red-600 tracking-widest hover:brightness-110 cursor-pointer bg-[#0a2e13] transition-all shadow-inner relative ${shakeZone === 'dontpass' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}
            >
              DON'T PASS BAR
              {pushZone === 'dont-pass' && (
                <div className="absolute inset-0 bg-yellow-500/80 flex items-center justify-center text-black font-black text-xl z-20 rounded animate-overlay-in">
                  PUSH
                </div>
              )}
              {tooltip?.zone === 'dontpass' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white font-bold text-sm z-20 rounded animate-overlay-in">
                  {tooltip.msg}
                </div>
              )}
              {displayState.dontPassBet > 0 && (
                 <div 
                    onClick={(e) => {
                       e.stopPropagation();
                       if (!isPuckOn) {
                          removeDontPassBet();
                       } else {
                          setShakeZone('dontpass-chip');
                          setTimeout(() => setShakeZone(null), 400);
                       }
                    }}
                    className={`absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-[3px] flex items-center justify-center font-black text-[10px] shadow-lg z-10 ${getLargestChipColor(displayState.dontPassBet)} ${dpWinPulse ? 'animate-pulse-gold ring-4 ring-yellow-400' : ''} ${shakeZone === 'dontpass-chip' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''} ${!isPuckOn ? 'cursor-pointer hover:-translate-y-1' : ''}`}
                 >
                    ${displayState.dontPassBet}
                    {isPuckOn && (
                       <div className="absolute -top-1 -right-1 bg-black rounded-full p-0.5 border border-white shadow-lg">
                          <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                       </div>
                    )}
                 </div>
              )}
            </div>

            {/* Pass Line */}
            {console.log('Pass Line render — displayState.passLineBet:', displayState.passLineBet, 'isShooter:', isShooter)}
            <div 
              onClick={handlePassLineClick}
              className={`h-20 w-full border-[3px] ${isPuckOn && displayState.passLineBet > 0 ? 'border-yellow-400' : 'border-white/30'} rounded-lg flex items-center justify-center text-4xl xl:text-5xl font-black text-[#3b82f6] tracking-widest hover:brightness-110 cursor-pointer bg-[#0a2e13] transition-all shadow-inner relative ${shakeZone === 'passline' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}
            >
              PASS LINE
              {tooltip?.zone === 'passline' && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-white font-bold text-lg z-20 rounded animate-overlay-in">
                  {tooltip.msg}
                </div>
              )}
              {displayState.passLineBet > 0 && (
                 <div 
                    onClick={(e) => {
                       e.stopPropagation();
                       if (!isPuckOn) {
                          removePassLineBet();
                       } else {
                          setShakeZone('passline-chip');
                          setTimeout(() => setShakeZone(null), 400);
                       }
                    }}
                    className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full border-[4px] flex items-center justify-center font-black text-sm shadow-lg z-10 ${getLargestChipColor(displayState.passLineBet)} ${winPulse ? 'animate-pulse-gold ring-4 ring-yellow-400' : ''} ${shakeZone === 'passline-chip' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''} ${!isPuckOn ? 'cursor-pointer hover:-translate-y-1' : ''}`}
                 >
                    ${displayState.passLineBet}
                    {isPuckOn && (
                       <div className="absolute -top-2 -right-2 bg-black rounded-full p-1 border border-white shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                       </div>
                    )}
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Win Condition */}
        <div className="w-[40px] flex flex-col items-center border-l-2 border-white/10 pl-4 py-2 shrink-0">
          <div className="text-center text-[9px] font-bold leading-tight mb-4 text-white/50 tracking-wider">WIN<br/>CONDITION</div>
          <div className="flex flex-col justify-between flex-1 w-full text-center">
            {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
              <div key={n} className="text-lg font-black text-white/70">{n}</div>
            ))}
          </div>
        </div>

      </main>
      

        </div>
      </div>      {/* Bottom Bar */}
      <div className="h-24 bg-[#111] flex justify-between items-center px-6 border-t border-black shrink-0 z-10 relative">
        {!isShooter && room && (
          <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm">
            <span className="text-white/80 font-bold tracking-widest text-sm uppercase">
              {lang === 'en' ? `Watching ${players.find(p => p.player_id === room.current_shooter_id)?.display_name || 'Shooter'} roll` : `Viendo tirar a ${players.find(p => p.player_id === room.current_shooter_id)?.display_name || 'Tirador'}`}
            </span>
          </div>
        )}
        <button 
          onClick={handleClearBets}
          disabled={!isShooter}
          className={`bg-[#dc2626] hover:bg-[#ef4444] text-white font-black py-3 px-8 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-sm tracking-wider ${(passLineBet === 0 && dontPassBet === 0) || !isShooter ? 'opacity-50 cursor-not-allowed' : ''} ${shakeZone === 'clear-bets' ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}
        >
          CLEAR ALL BETS
        </button>
        
        <div className="flex gap-3">
          {CHIPS.map(chip => (
            <button 
               key={chip.val} 
               onClick={() => setSelectedChip(selectedChip === chip.val ? null : chip.val)}
               disabled={balance === 0 || !isShooter}
               className={`w-14 h-14 rounded-full border-[4px] flex items-center justify-center font-black text-lg shadow-lg transition-all ${chip.colorClass} ${balance === 0 || !isShooter ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 cursor-pointer'} ${selectedChip === chip.val ? 'ring-4 ring-yellow-400 scale-110' : ''} ${shakeZone === 'chip-' + chip.val ? 'animate-[shake_0.2s_ease-in-out_2]' : ''}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        
        <div className="flex gap-4 items-center">
          <button disabled={!isShooter} className={`bg-[#222] hover:bg-[#333] text-white px-5 py-3 rounded-full font-bold text-[10px] border border-gray-600 transition-colors tracking-wider text-center leading-tight ${!isShooter ? 'opacity-50 cursor-not-allowed' : ''}`}>
            DOUBLE<br/>BET
          </button>
          <button disabled={!isShooter} className={`bg-[#222] hover:bg-[#333] text-white px-5 py-3 rounded-full font-bold text-[10px] border border-gray-600 transition-colors tracking-wider text-center leading-tight ${!isShooter ? 'opacity-50 cursor-not-allowed' : ''}`}>
            REPEAT<br/>LAST BET
          </button>
          <div className="relative group">
            <button 
              onClick={handleRollClick}
              disabled={isRolling || (passLineBet === 0 && dontPassBet === 0 && comeBets.length === 0 && dontComeBets.length === 0) || !isShooter}
              className={`w-20 h-20 rounded-full font-black text-xl border-[4px] shadow-inner transition-colors ${(isRolling || (passLineBet === 0 && dontPassBet === 0 && comeBets.length === 0 && dontComeBets.length === 0) || !isShooter) ? 'bg-[#333] text-gray-500 border-[#444] cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 cursor-pointer'}`}
            >
              ROLL
            </button>
            {(passLineBet === 0 && dontPassBet === 0 && comeBets.length === 0 && dontComeBets.length === 0) && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-black text-white text-xs text-center py-2 px-3 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                Place a bet to roll
              </div>
            )}
          </div>
        </div>
      </div>

      {isRolling && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center animate-overlay-in">
          <div className="flex gap-12 mb-12">
            <BigDice value={die1} isTumbling={isTumbling} animationClass="animate-dice-roll" />
            <BigDice value={die2} isTumbling={isTumbling} animationClass="animate-dice-roll-2" />
          </div>
          {!isTumbling && total && (
            <div className={`text-6xl font-black drop-shadow-xl animate-dice-appear ${getTotalColor(total)}`}>
              Total: {total}
            </div>
          )}
        </div>
      )}

      {/* Chat Sidebar */}
      <ChatSidebar 
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        unreadCount={unreadCount}
        sendMessage={handleSendMessage}
        localTier={localTier}
        players={players}
        currentShooterId={room?.current_shooter_id || null}
      />
    </div>
  );

  return (
    <LiveKitRoom
      video={false}
      audio={localTier === 1}
      token={lkToken ?? ''}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={!!lkToken}
    >
      {MainContent}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
