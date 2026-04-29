import React, { useRef, useEffect } from 'react';
import { useParticipants, useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';

export const ChatSidebar = ({
  messages,
  newMessage,
  setNewMessage,
  isChatOpen,
  setIsChatOpen,
  unreadCount,
  sendMessage,
  localTier,
  players,
  currentShooterId
}: {
  messages: any[];
  newMessage: string;
  setNewMessage: (s: string) => void;
  isChatOpen: boolean;
  setIsChatOpen: (b: boolean) => void;
  unreadCount: number;
  sendMessage: (e: React.FormEvent) => void;
  localTier: number;
  players: any[];
  currentShooterId: string | null;
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showPill, setShowPill] = React.useState(false);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatOpen]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isChatOpen) return;
    setShowPill(true);
    const timer = setTimeout(() => {
      setShowPill(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [messages, isChatOpen]);

  // Use LiveKit hooks
  const participants = useParticipants();
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [isAudioMuted, setIsAudioMuted] = React.useState(false);

  const toggleMic = () => {
    if (localParticipant) {
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    }
  };

  const toggleAudio = () => {
    room?.remoteParticipants.forEach(participant => {
      participant.audioTrackPublications.forEach(pub => {
        if (pub.audioTrack) {
          // @ts-ignore
          pub.audioTrack.setMuted(!isAudioMuted);
        }
      });
    });
    setIsAudioMuted(prev => !prev);
  };

  // Sort participants into tiers based on players state
  const getParticipantTier = (identity: string) => {
    const player = players.find(p => p.player_id === identity);
    return player ? Number(player.tier) : 3;
  };

  const tableParticipants = participants.filter(p => getParticipantTier(p.identity) === 1);
  const railParticipants = participants.filter(p => getParticipantTier(p.identity) === 2);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <>
      {/* Collapsed Pill */}
      {showPill && !isChatOpen && lastMessage && (
        <div 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-[110px] right-1/2 mr-[60px] z-50 bg-black/80 backdrop-blur border border-white/10 rounded-full pl-2 pr-4 py-2 flex items-center gap-3 cursor-pointer shadow-2xl hover:bg-black/90 transition-all animate-overlay-in max-w-[250px]"
        >
          <div className="w-8 h-8 shrink-0 rounded-full bg-gray-800 flex items-center justify-center text-sm border-2" style={{ borderColor: 'gray' }}>
            {lastMessage.avatar}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-white text-xs font-bold truncate">{lastMessage.display_name}</span>
            <span className="text-gray-300 text-[10px] truncate">{lastMessage.content}</span>
          </div>
        </div>
      )}

      {/* Always visible chat toggle button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed bottom-[110px] right-6 z-50 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-transform hover:scale-105 border-2 border-blue-400"
      >
        {isChatOpen ? (
          <span className="text-2xl font-black">✕</span>
        ) : (
          <span className="text-2xl">💬</span>
        )}
        {!isChatOpen && unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Expanded Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-[320px] bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-[#111]">
          <h2 className="font-bold text-white tracking-widest flex items-center gap-2">
            CHAT & VOICE
            {unreadCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h2>
          <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Voice Section */}
        <div className="flex flex-col p-4 border-b border-white/10 gap-4 shrink-0 max-h-[35%] overflow-y-auto">
          {participants.length > 0 && (
            <div className="flex gap-2">
              <button onClick={toggleAudio} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border border-white/10">
                {!isAudioMuted ? '🔇 MUTE ALL' : '🔊 UNMUTE ALL'}
              </button>
              <button onClick={toggleMic} className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 border border-white/10 ${isMicrophoneEnabled ? 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-red-600/20 text-red-400 border-red-500/50'}`}>
                {isMicrophoneEnabled ? '🎤 MIC ON' : '🎤 MIC OFF'}
              </button>
            </div>
          )}

          {tableParticipants.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">At the Table</span>
              <div className="flex flex-col gap-2">
                {tableParticipants.map(p => {
                  const pl = players.find(pl => pl.player_id === p.identity);
                  return (
                    <div key={p.identity} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5">
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 bg-black shrink-0 ${p.isSpeaking ? 'ring-2 ring-green-500 animate-pulse border-green-500' : 'border-yellow-500/50'}`}>
                        {pl?.avatar || '👤'}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-xs font-bold truncate">{pl?.display_name || 'Player'}</span>
                        <span className="text-[8px] font-black text-yellow-400 uppercase tracking-wider">TABLE</span>
                      </div>
                      
                      {p.isLocal ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={toggleMic} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${isMicrophoneEnabled ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                            {isMicrophoneEnabled ? '🎤' : <span className="line-through opacity-70">🎤</span>}
                          </button>
                          <button onClick={toggleAudio} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${!isAudioMuted ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                            {!isAudioMuted ? '🔊' : '🔇'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center shrink-0 w-6 h-6 justify-center">
                           {p.isSpeaking && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {railParticipants.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-green-400 tracking-widest uppercase">On the Rail</span>
              <div className="flex flex-col gap-2">
                {railParticipants.map(p => {
                  const pl = players.find(pl => pl.player_id === p.identity);
                  return (
                    <div key={p.identity} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg border border-white/5">
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 bg-black shrink-0 ${p.isSpeaking ? 'ring-2 ring-green-500 animate-pulse border-green-500' : 'border-green-500/50'}`}>
                        {pl?.avatar || '👤'}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-white text-xs font-bold truncate">{pl?.display_name || 'Player'}</span>
                        <span className="text-[8px] font-black text-green-400 uppercase tracking-wider">RAIL</span>
                      </div>
                      
                      {p.isLocal ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={toggleMic} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${isMicrophoneEnabled ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                            {isMicrophoneEnabled ? '🎤' : <span className="line-through opacity-70">🎤</span>}
                          </button>
                          <button onClick={toggleAudio} className={`w-7 h-7 rounded flex items-center justify-center text-xs ${!isAudioMuted ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                            {!isAudioMuted ? '🔊' : '🔇'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center shrink-0 w-6 h-6 justify-center">
                           {p.isSpeaking && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {participants.length === 0 && (
            <div className="text-xs text-gray-500 italic">No one in voice chat</div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg, i) => {
            if (msg.tier === 0) {
              return (
                <div key={i} className="flex justify-center my-2">
                  <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold text-white tracking-wide border border-white/5">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className="flex gap-3 text-sm">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 border-2 bg-black ${msg.tier === 1 ? 'border-yellow-500/50' : msg.tier === 2 ? 'border-green-500/50' : 'border-gray-500/50'}`}>
                  {msg.avatar}
                </div>
                <div className="flex flex-col pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{msg.display_name}</span>
                    <span className={`text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-wider ${
                      msg.tier === 1 ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50' :
                      msg.tier === 2 ? 'bg-green-600/20 text-green-400 border border-green-500/50' :
                      'bg-gray-600 text-white'
                    }`}>
                      {msg.tier === 1 ? 'TABLE' : msg.tier === 2 ? 'RAIL' : 'GUEST'}
                    </span>
                    {msg.player_id === currentShooterId && (
                      <span className="text-xs">🎲</span>
                    )}
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <div className="text-gray-300 mt-1 leading-tight whitespace-pre-wrap text-[13px]">{msg.content}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-[#111] shrink-0">
          <div className="relative">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Say something..."
              maxLength={200}
              className="w-full bg-black border border-white/20 rounded-lg pl-3 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 disabled:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
