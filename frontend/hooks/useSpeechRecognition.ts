// FILE PATH: voice-lead-agent/frontend/hooks/useSpeechRecognition.ts
//
// WHY THIS FILE EXISTS:
//   The browser's Web Speech API converts microphone audio → text (STT).
//   It's built into Chrome/Edge — zero cost, zero external API needed.
//
//   Raw Web Speech API usage is messy:
//   - You must handle start/stop/error/result events manually
//   - TypeScript doesn't include SpeechRecognition types by default
//   - You need to handle browser compatibility (Chrome only)
//   - Cleanup on unmount is easy to forget → memory leaks
//
//   This hook wraps all of that into 3 clean values:
//     isListening  → boolean (is mic active right now?)
//     transcript   → string (what was heard, updates in real time)
//     startListening() / stopListening() → control functions
//
// HOW WEB SPEECH API WORKS:
//   1. Browser asks user for microphone permission (first time only)
//   2. You call recognition.start() → mic opens
//   3. Browser streams audio to Google's speech servers (built-in)
//   4. Results fire as recognition.onresult events
//   5. You call recognition.stop() → mic closes, final result fires
//
// BROWSER SUPPORT:
//   ✅ Chrome (desktop + Android)
//   ✅ Edge
//   ❌ Firefox (not supported)
//   ❌ Safari (partial, unreliable)
//   → We check isSupported and show a fallback text input if false

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// TypeScript doesn't include Web Speech API types by default.
// We declare them manually here so we get full type safety.
// The actual implementation is provided by the browser at runtime.
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

// ── Hook return type ────────────────────────────────────────────
interface UseSpeechRecognitionReturn {
    isListening: boolean;        // Is the mic currently active?
    transcript: string;          // Live transcript (updates as user speaks)
    isSupported: boolean;        // Is Web Speech API available in this browser?
    startListening: () => void;  // Open the mic
    stopListening: () => void;   // Close the mic
    resetTranscript: () => void; // Clear the transcript text
}

// ── Hook options ────────────────────────────────────────────────
interface UseSpeechRecognitionOptions {
    // Called when a FINAL result arrives (user stopped speaking)
    onResult?: (transcript: string) => void;
    // Called when recognition encounters an error
    onError?: (error: string) => void;
    // Language for recognition — default English (US)
    lang?: string;
    // continuous: keep listening after first result?
    // false = stop after one sentence (better for voice agent turns)
    continuous?: boolean;
}

// ── The hook ────────────────────────────────────────────────────
export function useSpeechRecognition({
    onResult,
    onError,
    lang = "en-US",
    continuous = false,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");

    // useRef stores the recognition instance WITHOUT causing re-renders.
    // If we used useState, every recognition event would trigger a re-render.
    // useRef is perfect for mutable objects that don't affect the UI directly.
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Check if the browser supports Web Speech API
    // This runs once on mount (empty dependency array)
    const isSupported =
        typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    // ── Initialize recognition ────────────────────────────────────
    useEffect(() => {
        // Don't run on the server (Next.js SSR) or unsupported browsers
        if (!isSupported) return;

        // Chrome uses webkitSpeechRecognition, others use SpeechRecognition
        const SpeechRecognitionAPI =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        const recognition = new SpeechRecognitionAPI();

        // ── Configuration ─────────────────────────────────────────
        // continuous: false → recognition stops after user pauses speaking
        //             This is what we want — one turn at a time
        recognition.continuous = continuous;

        // interimResults: true → fire events with partial results as user speaks
        //                 Lets us show live transcript updates in the UI
        recognition.interimResults = true;

        recognition.lang = lang;

        // ── Event handlers ────────────────────────────────────────

        // onresult fires whenever speech is detected
        // results is a SpeechRecognitionResultList — iterate to get transcript
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = "";
            let finalTranscript = "";

            // Loop through all results (there can be multiple)
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text = result[0].transcript; // Best guess from the API

                if (result.isFinal) {
                    // isFinal = true → this is the confirmed, final text
                    finalTranscript += text;
                } else {
                    // isFinal = false → still processing, may change
                    interimTranscript += text;
                }
            }

            // Update the live transcript display
            setTranscript(finalTranscript || interimTranscript);

            // Call onResult callback with the final text
            // This is what triggers the API call to the backend
            if (finalTranscript && onResult) {
                onResult(finalTranscript.trim());
            }
        };

        // onend fires when recognition stops (user paused or stopListening called)
        recognition.onend = () => {
            setIsListening(false);
        };

        // onerror fires on microphone or network errors
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            setIsListening(false);

            // "no-speech" is not a real error — user just didn't speak
            // Don't show an error for this case
            if (event.error === "no-speech") return;

            const errorMessages: Record<string, string> = {
                "not-allowed":
                    "Microphone access denied. Please allow microphone in browser settings.",
                "audio-capture":
                    "No microphone found. Please connect a microphone.",
                "network":
                    "Network error during speech recognition. Check your connection.",
                "aborted":
                    "Speech recognition was aborted.",
            };

            const message =
                errorMessages[event.error] ||
                `Speech recognition error: ${event.error}`;

            if (onError) onError(message);
        };

        // Store the instance in the ref
        recognitionRef.current = recognition;

        // ── Cleanup on unmount ────────────────────────────────────
        // Stop recognition when the component using this hook unmounts.
        // Without this, the mic stays open even after navigating away.
        return () => {
            recognition.onresult = null;
            recognition.onend = null;
            recognition.onerror = null;
            try {
                recognition.abort();
            } catch {
                // Ignore errors during cleanup
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSupported, lang, continuous]);

    // ── Control functions ─────────────────────────────────────────

    // useCallback prevents these functions from being recreated on every render.
    // Important for performance when passed as props to child components.
    const startListening = useCallback(() => {
        if (!recognitionRef.current || isListening) return;

        setTranscript(""); // Clear previous transcript
        setIsListening(true);

        try {
            recognitionRef.current.start();
        } catch {
            // start() throws if called while already running
            setIsListening(false);
        }
    }, [isListening]);

    const stopListening = useCallback(() => {
        if (!recognitionRef.current || !isListening) return;

        try {
            // stop() processes any remaining audio and fires onresult
            // abort() discards remaining audio immediately
            // We use stop() so we don't lose the last word
            recognitionRef.current.stop();
        } catch {
            // Ignore errors
        }

        setIsListening(false);
    }, [isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript("");
    }, []);

    return {
        isListening,
        transcript,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
    };
}