"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Manual type declarations ────────────────────────────────────
// TypeScript's built-in DOM lib doesn't include these Speech API types.
// We declare them here so the compiler is happy.
declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
    interface SpeechRecognitionInstance extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        start(): void;
        stop(): void;
        abort(): void;
        onresult: ((event: SpeechResultEvent) => void) | null;
        onend: (() => void) | null;
        onerror: ((event: SpeechErrEvent) => void) | null;
    }
    interface SpeechResultEvent {
        resultIndex: number;
        results: SpeechRecognitionResultList;
    }
    interface SpeechErrEvent {
        error: string;
    }
}

interface Options {
    onResult?: (transcript: string) => void;
    onError?: (error: string) => void;
    lang?: string;
    continuous?: boolean;
}

interface Return {
    isListening: boolean;
    transcript: string;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export function useSpeechRecognition({
    onResult,
    onError,
    lang = "en-US",
    continuous = false,
}: Options = {}): Return {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    // Check support after mount only (avoids hydration mismatch)
    useEffect(() => {
        setIsSupported(
            "SpeechRecognition" in window || "webkitSpeechRecognition" in window
        );
    }, []);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechAPI();

        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event: SpeechResultEvent) => {
            let interim = "";
            let final = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += text;
                } else {
                    interim += text;
                }
            }
            setTranscript(final || interim);
            if (final && onResult) onResult(final.trim());
        };

        recognition.onend = () => setIsListening(false);

        recognition.onerror = (event: SpeechErrEvent) => {
            setIsListening(false);
            if (event.error === "no-speech") return;
            const msgs: Record<string, string> = {
                "not-allowed": "Microphone access denied. Allow it in browser settings.",
                "audio-capture": "No microphone found.",
                "network": "Network error during speech recognition.",
            };
            if (onError) onError(msgs[event.error] || `Mic error: ${event.error}`);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.onresult = null;
            recognition.onend = null;
            recognition.onerror = null;
            try { recognition.abort(); } catch { /* ignore */ }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported, lang, continuous]);

    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) return;
        setTranscript("");
        setIsListening(true);
        try { recognitionRef.current.start(); }
        catch { setIsListening(false); }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isListening) return;
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        setIsListening(false);
    }, [isListening]);

    const resetTranscript = useCallback(() => setTranscript(""), []);

    return {
        isListening,
        transcript,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
    };
}