'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioMessagePlayerProps {
  src: string;
  isMe?: boolean;
}

export function AudioMessagePlayer({ src, isMe = false }: AudioMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Audio play error', err);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center space-x-2.5 py-1 min-w-[200px] max-w-[280px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause round button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-xs transition-transform active:scale-95 flex-shrink-0 cursor-pointer ${
          isMe ? 'bg-[#008069] hover:bg-[#005c4b]' : 'bg-[#00a884] hover:bg-[#008069]'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
      </button>

      {/* Progress & duration */}
      <div className="flex-1 flex flex-col justify-center min-w-0">
        <div className="relative flex items-center w-full my-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00a884]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-gray-500 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center space-x-1">
            <Mic className="w-3 h-3 text-[#00a884]" />
            <span>{duration > 0 ? formatTime(duration) : 'Vocal'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AudioMessagePlayer;
