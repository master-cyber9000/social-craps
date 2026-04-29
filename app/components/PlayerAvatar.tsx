import React from 'react';

export interface Player {
  player_id: string;
  display_name: string;
  avatar: string;
  border_color: string;
  balance: number;
  is_connected: boolean;
  tier: number;
  seat_number: number | null;
}

interface PlayerAvatarProps {
  player: Player;
  isShooter: boolean;
  isLocal: boolean;
  size: 'large' | 'small';
  lang: 'en' | 'es';
  position?: 'top' | 'bottom' | 'left' | 'right';
  isSpeaking?: boolean;
}

export function PlayerAvatar({ player, isShooter, isLocal, size, lang, position = 'bottom', isSpeaking = false }: PlayerAvatarProps) {
  // Determine if they are Tier 1 / Tier 2 / Tier 3 based on player.tier
  const isTier1 = player.tier === 1;
  const isTier2 = player.tier === 2;
  const isTier3 = player.tier === 3;

  const getBorderClass = () => {
    if (isShooter || isTier1) return "border-yellow-400";
    return "";
  };

  const getPulseClass = () => {
    if (isShooter) return "animate-[pulse_2s_infinite] shadow-[0_0_20px_rgba(250,204,21,0.6)]";
    if (isTier1) return "animate-[pulse_3s_infinite] shadow-[0_0_15px_rgba(250,204,21,0.3)]";
    return "";
  };

  const borderStyle = (isShooter || isTier1) ? {} : { borderColor: player.border_color };

  if (size === 'large') {
    return (
      <div className={`relative flex flex-col items-center justify-center transition-opacity duration-300 ${!player.is_connected ? 'opacity-50' : 'opacity-100'}`}>
        <div 
          className={`relative w-16 h-16 rounded-full flex items-center justify-center text-[28px] border-[3px] bg-black shadow-lg ${getBorderClass()} ${getPulseClass()} ${isSpeaking ? 'ring-4 ring-green-500 animate-pulse border-green-500' : ''}`}
          style={isSpeaking ? {} : borderStyle}
        >
          {player.avatar}
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black ${player.is_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
          
          {(isTier1 || isShooter) && (
            <div className="absolute -top-2 -right-2 bg-black border border-white/20 rounded-full p-1 text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8h-2a5 5 0 01-10 0H3a7.001 7.001 0 006 6.93V17H6v2h8v-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
        <div className={`absolute ${
          position === 'top' ? 'bottom-full mb-1 left-1/2 -translate-x-1/2' : 
          position === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' : 
          position === 'right' ? 'left-full ml-2 top-1/2 -translate-y-1/2' : 
          'top-full mt-1 left-1/2 -translate-x-1/2'
        } text-center bg-black/50 px-2 py-1 rounded w-max z-50`}>
          <div className="text-white text-xs font-bold whitespace-nowrap">{player.display_name}</div>
          <div className="text-yellow-400 text-[10px] font-black tracking-wider whitespace-nowrap">${player.balance.toFixed(2)}</div>
          <div className="mt-0.5">
            {isShooter ? (
              <span className="bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                {lang === 'en' ? 'SHOOTING' : 'TIRANDO'}
              </span>
            ) : isTier1 ? (
              <span className="bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                {lang === 'en' ? 'AT THE TABLE' : 'EN LA MESA'}
              </span>
            ) : (
              <span className="bg-green-600/20 border border-green-500/50 text-green-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider inline-block">
                {lang === 'en' ? 'RAIL' : 'BARANDA'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Small size (Tier 3 / Guest)
  return (
    <div className={`flex flex-col items-center justify-center transition-opacity duration-300 ${!player.is_connected ? 'opacity-50' : 'opacity-100'}`}>
      <div 
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-[18px] border-2 bg-black shadow-md"
        style={{ borderColor: player.border_color }}
      >
        {player.avatar}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-black ${player.is_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
      </div>
      <div className="mt-1 text-center">
        <div className="text-white text-[10px] font-bold whitespace-nowrap max-w-[50px] overflow-hidden text-ellipsis">{player.display_name}</div>
        <div className="mt-0.5">
          <span className="bg-gray-700 text-gray-300 text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wider inline-block">
            {lang === 'en' ? 'WATCHING' : 'MIRANDO'}
          </span>
        </div>
      </div>
    </div>
  );
}
