'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Send, Mic, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoice: (audioData: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendVoice, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording automatically on mount
  useEffect(() => {
    let isMounted = true;

    async function startRecording() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Enregistrement audio non supporté sur ce navigateur.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        audioChunksRef.current = [];

        // Check supported MIME type
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(200); // chunk every 200ms
        mediaRecorderRef.current = recorder;
        setIsRecording(true);

        // Start timer
        setDuration(0);
        timerIntervalRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error('Microphone error:', err);
        setErrorMessage(
          err.name === 'NotAllowedError'
            ? 'Accès au microphone refusé. Autorisez le micro pour enregistrer.'
            : 'Impossible d’accéder au microphone.'
        );
      }
    }

    startRecording();

    return () => {
      isMounted = false;
      cleanupStream();
    };
  }, []);

  const cleanupStream = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleCancel = () => {
    cleanupStream();
    onCancel();
  };

  const handleStopAndSend = () => {
    if (!mediaRecorderRef.current || audioChunksRef.current.length === 0) {
      handleCancel();
      return;
    }

    const recorder = mediaRecorderRef.current;
    const recordedDuration = duration;

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onSendVoice(base64data, recordedDuration);
      };
      reader.readAsDataURL(audioBlob);

      cleanupStream();
    };

    recorder.stop();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (errorMessage) {
    return (
      <div className="flex items-center justify-between w-full bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 animate-in fade-in">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
        <button
          onClick={handleCancel}
          className="ml-3 px-2 py-1 bg-red-100 hover:bg-red-200 rounded-md text-red-800 font-semibold transition"
        >
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full bg-emerald-50/80 border border-emerald-200 rounded-xl px-3 py-2 animate-in fade-in">
      {/* Recording status & pulsing dot */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex items-center justify-center">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute" />
          <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-gray-800">
          <Mic className="w-4 h-4 text-red-600 animate-pulse" />
          <span>{formatTimer(duration)}</span>
        </div>

        {/* Audio waveform visualization bars */}
        <div className="flex items-center space-x-1 pl-2">
          <div className="w-1 h-3 bg-emerald-500 rounded-full animate-pulse" />
          <div className="w-1 h-5 bg-emerald-600 rounded-full animate-pulse delay-75" />
          <div className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
          <div className="w-1 h-4 bg-emerald-600 rounded-full animate-pulse delay-100" />
          <div className="w-1 h-6 bg-emerald-500 rounded-full animate-pulse delay-200" />
        </div>
      </div>

      {/* Action buttons: Discard or Send */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={handleCancel}
          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-100/60 rounded-full transition cursor-pointer"
          title="Annuler l'enregistrement vocal"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleStopAndSend}
          disabled={duration < 1}
          className="px-3 py-1.5 bg-[#00a884] hover:bg-[#008069] text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
          title="Envoyer le message vocal"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Envoyer</span>
        </button>
      </div>
    </div>
  );
}
