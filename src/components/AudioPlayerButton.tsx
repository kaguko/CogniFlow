import React, { useState } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import { playBase64Pcm } from '../utils/audioPlayer';

interface AudioPlayerButtonProps {
  textToSpeak: string;
  label?: string;
  className?: string;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  textToSpeak,
  label = 'Nghe Tóm Tắt Voice',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSpeak = async () => {
    if (isPlaying) {
      // Just toggle state; Web Audio will finish buffer
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voice: 'Kore',
        }),
      });

      if (!res.ok) {
        throw new Error('TTS response not ok');
      }

      const data = await res.json();
      if (data.audio) {
        setIsLoading(false);
        setIsPlaying(true);
        await playBase64Pcm(data.audio, data.sampleRate || 24000);
        setIsPlaying(false);
      } else {
        throw new Error('No audio returned');
      }
    } catch (err) {
      console.warn('TTS playback fallback: speech synthesis or server unavailable', err);
      // Fallback to browser SpeechSynthesis if server TTS has no key
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'vi-VN';
        utterance.onend = () => setIsPlaying(false);
        setIsLoading(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsLoading(false);
        setIsPlaying(false);
      }
    }
  };

  return (
    <button
      onClick={handleSpeak}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
        isPlaying
          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
      } ${className}`}
      title={label}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
      ) : isPlaying ? (
        <Square className="w-3 h-3 text-amber-400 fill-amber-400" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
      )}
      <span>{isLoading ? 'Đang tải âm thanh...' : isPlaying ? 'Đang phát...' : label}</span>
    </button>
  );
};
