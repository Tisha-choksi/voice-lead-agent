"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Manual type declarations — TS dom lib doesn't include these by default
declare global {
  interface Window {
    SpeechRecognition:       new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance extends EventTarget {
    continuous:      boolean;
    interimResults:  boolean;
    lang:            string;
    start():  void;
    stop():   void;
    abort():  void;
    onresult: ((e: SpeechResultEvent) => void) | null;
    onend:    (() => void) | null;
    onerror:  ((e: SpeechErrEvent) => void) | null;
  }
  interface SpeechResultEvent {
    resultIndex: number;
    results:     SpeechRecognitionResultList;
  }
  interface SpeechErrEvent { error: string; }
}

interface Options {
  onResult?:  (transcript: string) => void;
  onError?:   (error: string) => void;
  lang?:      string;
  continuous?: boolean;
}

interface Return {
  isListening:     boolean;
  transcript:      string;
  isSupported:     boolean;
  startListening:  () => void;
  stopListening:   () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition({
  onResult, onError, lang = "en-IN", continuous = false,
}: Options = {}): Return {
  const [isListening, setIsListening] = useState(false);
  const [transcript,  setTranscript]  = useState("");
  // Start false on both server AND client to avoid hydration mismatch
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setIsSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  useEffect(() => {
    if (!isSupported) return;
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SpeechAPI();
    r.continuous = continuous; r.interimResults = true; r.lang = lang;

    r.onresult = (e: SpeechResultEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += text; else interim += text;
      }
      setTranscript(final || interim);
      if (final && onResult) onResult(final.trim());
    };

    r.onend    = () => setIsListening(false);
    r.onerror  = (e: SpeechErrEvent) => {
      setIsListening(false);
      if (e.error === "no-speech") return;
      const msgs: Record<string, string> = {
        "not-allowed":   "Microphone access denied. Allow it in browser settings.",
        "audio-capture": "No microphone found.",
        "network":       "Network error during recognition.",
      };
      if (onError) onError(msgs[e.error] || `Mic error: ${e.error}`);
    };

    recognitionRef.current = r;
    return () => {
      r.onresult = null; r.onend = null; r.onerror = null;
      try { r.abort(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, lang, continuous]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setTranscript(""); setIsListening(true);
    try { recognitionRef.current.start(); } catch { setIsListening(false); }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    try { recognitionRef.current.stop(); } catch { /* ignore */ }
    setIsListening(false);
  }, [isListening]);

  const resetTranscript = useCallback(() => setTranscript(""), []);

  return { isListening, transcript, isSupported, startListening, stopListening, resetTranscript };
}
