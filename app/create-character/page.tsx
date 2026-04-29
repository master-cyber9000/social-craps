"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateUUID } from '@/lib/utils';

const AVATARS = ['🎲', '🎯', '🦁', '🐺', '🦅', '🐉', '🦊', '🔥', '💎', '🌊', '👑', '🃏'];
const COLORS = [
  { id: 'gold', hex: '#FFD700' },
  { id: 'red', hex: '#EF4444' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'green', hex: '#22C55E' },
  { id: 'purple', hex: '#A855F7' },
  { id: 'white', hex: '#FFFFFF' }
];

export default function CreateCharacter() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'es'>('en');

  useEffect(() => {
    setIsMounted(true);
    const existing = localStorage.getItem('craps-character');
    if (existing) {
      router.push('/');
    }
    const savedLang = localStorage.getItem('craps-language') as 'en' | 'es' | null;
    if (savedLang) setLang(savedLang);
  }, [router]);

  if (!isMounted) return null;

  const handleSubmit = () => {
    if (!name || !selectedAvatar || !selectedColor) return;
    const character = {
      displayName: name,
      avatar: selectedAvatar,
      borderColor: selectedColor,
      playerId: generateUUID()
    };
    localStorage.setItem('craps-character', JSON.stringify(character));
    
    const redirectUrl = sessionStorage.getItem('craps-redirect-url');
    if (redirectUrl) {
      sessionStorage.removeItem('craps-redirect-url');
      window.location.href = redirectUrl;
    } else {
      router.push('/');
    }
  };

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'es' : 'en';
    setLang(newLang);
    localStorage.setItem('craps-language', newLang);
  };

  const isFormValid = name.trim().length > 0 && selectedAvatar && selectedColor;

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-white p-6 relative font-sans">
      <div className="absolute top-6 right-6">
        <button 
          onClick={toggleLang}
          className="bg-gray-800 hover:bg-white hover:text-black text-white px-4 py-2 rounded text-sm font-bold shadow transition-colors"
        >
          {lang === 'en' ? 'EN / ES' : 'ES / EN'}
        </button>
      </div>

      <div className="max-w-md w-full bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-white/10">
        <h1 className="text-3xl font-black text-center mb-8 tracking-widest text-white/90">
          {lang === 'en' ? 'CREATE YOUR PLAYER' : 'CREA TU JUGADOR'}
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">
              {lang === 'en' ? 'Your Name' : 'Tu Nombre'}
            </label>
            <input
              type="text"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-yellow-400 transition-colors"
              placeholder={lang === 'en' ? 'Enter name (max 20)' : 'Ingresa nombre (max 20)'}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
              {lang === 'en' ? 'Select Avatar' : 'Selecciona Avatar'}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {AVATARS.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`text-4xl aspect-square flex items-center justify-center rounded-xl bg-black border-2 transition-all hover:-translate-y-1 ${
                    selectedAvatar === emoji ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] bg-white/5' : 'border-transparent hover:border-white/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">
              {lang === 'en' ? 'Select Color' : 'Selecciona Color'}
            </label>
            <div className="flex justify-between px-2">
              {COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.hex)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: color.hex }}
                >
                  {selectedColor === color.hex && (
                    <svg className="w-6 h-6 text-black drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-xl font-black text-xl tracking-widest mt-8 transition-all ${
              isFormValid 
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] cursor-pointer' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {lang === 'en' ? "LET'S ROLL" : 'A TIRAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
