"use client";

// Plays base64 MP3 audio received from the backend Edge TTS service.
// Much higher quality than browser SpeechSynthesis — Microsoft Neural voices.

import { useState, useRef, useCallback } from "react";

interface Return {
  isSpeaking: boolean;
  playAudio:  (base64: string) => Promise<void>;
  stopAudio:  () => void;
}

export function useEdgeTTS(onEnd?: () => void): Return {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback(async (base64: string) => {
    if (!base64) return;
    stopAudio();

    try {
      // base64 → binary → Blob → Object URL → Audio element
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const blob  = new Blob([bytes], { type: "audio/mpeg" });
      const url   = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay  = () => setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onEnd?.();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        audioRef.current = null;
        onEnd?.();
      };

      await audio.play();
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsSpeaking(false);
      onEnd?.();
    }
  }, [stopAudio, onEnd]);

  return { isSpeaking, playAudio, stopAudio };
}
