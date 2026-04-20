"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Options {
    onEnd?: () => void;
    rate?: number;
    pitch?: number;
    volume?: number;
}

interface Return {
    isSpeaking: boolean;
    speak: (text: string) => void;
    stop: () => void;
    isSupported: boolean;
}

const PREFERRED_VOICES = [
    "Samantha",
    "Google UK English Female",
    "Microsoft Aria Online (Natural)",
    "Microsoft Zira Desktop",
    "Karen",
];

export function useSpeechSynthesis({
    onEnd,
    rate = 1.0,
    pitch = 1.05,
    volume = 1.0,
}: Options = {}): Return {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

    const isSupported =
        typeof window !== "undefined" && "speechSynthesis" in window;

    useEffect(() => {
        if (!isSupported) return;

        const selectVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (!voices.length) return;

            for (const name of PREFERRED_VOICES) {
                const v = voices.find((v) => v.name.includes(name));
                if (v) { voiceRef.current = v; return; }
            }
            const english = voices.find((v) => v.lang.startsWith("en"));
            if (english) voiceRef.current = english;
        };

        selectVoice();
        window.speechSynthesis.addEventListener("voiceschanged", selectVoice);
        return () => window.speechSynthesis.removeEventListener("voiceschanged", selectVoice);
    }, [isSupported]);

    const speak = useCallback((text: string) => {
        if (!isSupported || !text.trim()) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) utterance.voice = voiceRef.current;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => { setIsSpeaking(false); onEnd?.(); };
        utterance.onerror = (e) => {
            if (e.error !== "interrupted") console.error("TTS error:", e.error);
            setIsSpeaking(false);
            onEnd?.();
        };

        window.speechSynthesis.speak(utterance);
    }, [isSupported, rate, pitch, volume, onEnd]);

    const stop = useCallback(() => {
        if (!isSupported) return;
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, [isSupported]);

    useEffect(() => {
        return () => { if (isSupported) window.speechSynthesis.cancel(); };
    }, [isSupported]);

    return { isSpeaking, speak, stop, isSupported };
}