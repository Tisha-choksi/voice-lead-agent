// FILE PATH: voice-lead-agent/frontend/hooks/useSpeechSynthesis.ts
//
// WHY THIS FILE EXISTS:
//   The browser's SpeechSynthesis API converts text → spoken audio (TTS).
//   Built into all modern browsers — zero cost, zero external API needed.
//
//   This hook wraps the raw API to provide:
//   ✓ speak(text)   → makes Aria say something
//   ✓ stop()        → immediately silences Aria
//   ✓ isSpeaking    → lets the UI know to show the "speaking" orb animation
//   ✓ Voice selection → automatically picks a female voice for Aria
//
// HOW SPEECH SYNTHESIS WORKS:
//   1. Create a SpeechSynthesisUtterance with the text
//   2. Optionally configure voice, rate, pitch, volume
//   3. Call window.speechSynthesis.speak(utterance)
//   4. Browser speaks the text through the system's TTS engine
//   5. onend event fires when speech is complete
//
// VOICE SELECTION QUIRK:
//   Voices load asynchronously — they're not available immediately on page load.
//   The browser fires a 'voiceschanged' event when they're ready.
//   We listen for this event and select the best voice then.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Hook return type ────────────────────────────────────────────
interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;           // Is Aria currently speaking?
  speak: (text: string) => void; // Make Aria say something
  stop: () => void;              // Stop speaking immediately
  isSupported: boolean;          // Is TTS available in this browser?
}

// ── Hook options ────────────────────────────────────────────────
interface UseSpeechSynthesisOptions {
  // Called when Aria finishes speaking (use to re-enable the mic)
  onEnd?: () => void;
  // Speech rate: 0.1 (very slow) to 10 (very fast). 1.0 = normal
  rate?: number;
  // Pitch: 0 (low) to 2 (high). 1.0 = normal
  pitch?: number;
  // Volume: 0 (silent) to 1 (max)
  volume?: number;
}

// ── Preferred voice names (in priority order) ──────────────────
// Different operating systems have different TTS voices available.
// We try these in order and fall back to the first available voice.
const PREFERRED_VOICES = [
  "Samantha",            // macOS/iOS — sounds great
  "Google UK English Female", // Chrome on Windows/Linux
  "Microsoft Aria Online (Natural)", // Windows Edge
  "Microsoft Zira Desktop", // Windows fallback
  "Karen",               // macOS alternative
  "Moira",               // macOS Irish English
];

// ── The hook ────────────────────────────────────────────────────
export function useSpeechSynthesis({
  onEnd,
  rate = 1.0,
  pitch = 1.05,
  volume = 1.0,
}: UseSpeechSynthesisOptions = {}): UseSpeechSynthesisReturn {

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Check browser support
  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // ── Voice selection ───────────────────────────────────────────
  // Runs once when voices become available
  useEffect(() => {
    if (!isSupported) return;

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return; // Not loaded yet

      // Try each preferred voice in order
      for (const preferredName of PREFERRED_VOICES) {
        const voice = voices.find((v) =>
          v.name.includes(preferredName)
        );
        if (voice) {
          setSelectedVoice(voice);
          return;
        }
      }

      // Fallback: find any English female voice
      const englishVoice = voices.find(
        (v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("female")
      );
      if (englishVoice) {
        setSelectedVoice(englishVoice);
        return;
      }

      // Last resort: just use the first English voice
      const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
      if (anyEnglish) setSelectedVoice(anyEnglish);
    };

    // Try immediately (voices may already be loaded)
    selectVoice();

    // Also listen for the voiceschanged event (fires after async load)
    window.speechSynthesis.addEventListener("voiceschanged", selectVoice);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", selectVoice);
    };
  }, [isSupported]);

  // ── speak() ──────────────────────────────────────────────────
  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return;

      // Cancel any speech currently playing
      // (prevents overlapping if called quickly)
      window.speechSynthesis.cancel();

      // Create the utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Apply voice settings
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      // ── Utterance events ────────────────────────────────────
      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd(); // Tell the agent to re-enable the mic
      };

      utterance.onerror = (event) => {
        // "interrupted" happens when we call cancel() — not a real error
        if (event.error !== "interrupted") {
          console.error("TTS error:", event.error);
        }
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      // Speak!
      window.speechSynthesis.speak(utterance);
    },
    [isSupported, selectedVoice, rate, pitch, volume, onEnd]
  );

  // ── stop() ───────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  return { isSpeaking, speak, stop, isSupported };
}