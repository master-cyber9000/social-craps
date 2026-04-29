"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateRoomCode } from '@/lib/utils';

interface Character {
  displayName: string;
  avatar: string;
  borderColor: string;
  playerId: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [character, setCharacter] = useState<Character | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const [isLoadingJoin, setIsLoadingJoin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shakeJoin, setShakeJoin] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const existing = localStorage.getItem('craps-character');
    if (!existing) {
      router.push('/create-character');
    } else {
      setCharacter(JSON.parse(existing));
    }
    const savedLang = localStorage.getItem('craps-language') as 'en' | 'es' | null;
    if (savedLang) setLang(savedLang);
  }, [router]);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  if (!isMounted || !character) return null;

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'es' : 'en';
    setLang(newLang);
    localStorage.setItem('craps-language', newLang);
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomCode(e.target.value.toUpperCase().slice(0, 6));
  };

  const handleCreateTable = async () => {
    if (!character) return;
    setIsLoadingCreate(true);
    const code = generateRoomCode();
    
    const { error: roomError } = await supabase
      .from('craps_tables')
      .insert({
        code,
        host_id: character.playerId,
        status: 'waiting',
        current_shooter_id: character.playerId,
        point: null,
        phase: 'come-out',
        last_roll_die1: null,
        last_roll_die2: null,
        last_roll_total: null,
        created_at: new Date().toISOString()
      });

    if (roomError) {
      console.error('Error creating room:', roomError);
      setErrorMsg(lang === 'en' ? 'Error creating table. Try again.' : 'Error al crear mesa. Intenta de nuevo.');
      setIsLoadingCreate(false);
      return;
    }

    const { error: playerError } = await supabase
      .from('craps_players')
      .insert({
        table_code: code,
        player_id: character.playerId,
        display_name: character.displayName,
        avatar: character.avatar,
        border_color: character.borderColor,
        tier: 1,
        balance: 100.00,
        is_connected: true,
        seat_number: 1
      });

    if (playerError) {
      console.error('Error inserting player:', playerError);
      setErrorMsg(lang === 'en' ? 'Error creating table. Try again.' : 'Error al crear mesa. Intenta de nuevo.');
      setIsLoadingCreate(false);
      return;
    }

    router.push(`/table/${code}`);
  };

  const handleJoinTable = async () => {
    if (!character) return;
    const code = roomCode.toUpperCase().trim();
    if (!code) return;

    setIsLoadingJoin(true);
    
    const { data: room, error } = await supabase
      .from('craps_tables')
      .select('*')
      .eq('code', code)
      .single();

    if (error || !room) {
      setShakeJoin(true);
      setErrorMsg(lang === 'en' ? 'Room not found' : 'Sala no encontrada');
      setTimeout(() => setShakeJoin(false), 400);
      setIsLoadingJoin(false);
      return;
    }

    if (room.status === 'finished') {
      setShakeJoin(true);
      setErrorMsg(lang === 'en' ? 'This game has ended' : 'Este juego ha terminado');
      setTimeout(() => setShakeJoin(false), 400);
      setIsLoadingJoin(false);
      return;
    }

    router.push(`/table/${code}`);
  };

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 relative font-sans overflow-hidden">
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleLang}
          className="bg-gray-800 hover:bg-white hover:text-black text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors"
        >
          {lang === 'en' ? 'EN / ES' : 'ES / EN'}
        </button>
      </div>

      <div className="absolute top-6 left-6 flex items-center gap-4 bg-black/40 p-3 rounded-full border border-white/10">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-4 bg-black"
          style={{ borderColor: character.borderColor }}
        >
          {character.avatar}
        </div>
        <div className="pr-4 font-black tracking-wider text-white/90">
          {character.displayName}
        </div>
      </div>

      <div className="flex flex-col items-center z-10">
        <h1 className="text-6xl md:text-8xl font-black text-center mb-4 tracking-[0.2em] text-white/90 drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">
          SOCIAL CRAPS
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 font-bold tracking-widest uppercase mb-16">
          {lang === 'en' ? 'Roll with your crew.' : 'Tira con tu gente.'}
        </p>

        <div className="flex flex-col gap-6 w-full max-w-sm">
          <button 
            onClick={handleCreateTable}
            disabled={isLoadingCreate || isLoadingJoin}
            className={`w-full text-white py-5 rounded-xl font-black text-xl tracking-widest transition-all ${
              isLoadingCreate ? 'bg-[#1a5c2a] opacity-70 cursor-not-allowed' : 'bg-[#1a5c2a] hover:bg-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:-translate-y-1'
            }`}
          >
            {isLoadingCreate ? '...' : lang === 'en' ? 'CREATE TABLE' : 'CREAR MESA'}
          </button>
          
          <button 
            onClick={() => setShowJoinModal(true)}
            className="w-full bg-transparent border-[3px] border-white/20 hover:border-white text-white py-5 rounded-xl font-black text-xl tracking-widest transition-all hover:-translate-y-1"
          >
            {lang === 'en' ? 'JOIN TABLE' : 'UNIRSE A MESA'}
          </button>
        </div>
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-overlay-in">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-center tracking-widest">
              {lang === 'en' ? 'ENTER ROOM CODE' : 'INGRESA EL CÓDIGO'}
            </h2>
            <input
              type="text"
              value={roomCode}
              onChange={handleRoomCodeChange}
              className={`w-full bg-black border-[3px] border-white/20 rounded-xl px-4 py-4 text-3xl font-black text-center text-white focus:outline-none focus:border-blue-500 transition-colors tracking-[0.5em] mb-8 ${shakeJoin ? 'animate-[shake_0.2s_ease-in-out_2] border-red-500' : ''}`}
              placeholder="XXXXXX"
            />
            <div className="flex gap-4">
              <button 
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg font-bold tracking-wider transition-colors"
              >
                {lang === 'en' ? 'CANCEL' : 'CANCELAR'}
              </button>
              <button 
                onClick={handleJoinTable}
                disabled={roomCode.length === 0 || isLoadingJoin}
                className={`flex-1 py-3 rounded-lg font-bold tracking-wider transition-colors ${
                  roomCode.length > 0 && !isLoadingJoin
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isLoadingJoin ? '...' : lang === 'en' ? 'JOIN' : 'UNIRSE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-lg font-bold shadow-2xl z-50 animate-overlay-in">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
