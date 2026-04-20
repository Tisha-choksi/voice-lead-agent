"use client";

import { useCallback, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useAgentStore } from "@/store/agentStore";
import { chatWithAgent } from "@/lib/api";

export interface UseVoiceAgentReturn {
    isListening: boolean;
    isSpeaking: boolean;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    sendTextMessage: (text: string) => Promise<void>;
    resetSession: () => void;
}

export function useVoiceAgent(): UseVoiceAgentReturn {
    const {
        addMessage,
        setSessionId,
        setLeadScore,
        setQualificationData,
        setStatus,
        resetSession: storeReset,
        sessionId,
        conversationHistory,
        addToHistory,
    } = useAgentStore();

    const processingRef = useRef(false);

    // ── TTS ────────────────────────────────────────────────────────
    const { isSpeaking, speak, stop } = useSpeechSynthesis({
        onEnd: () => setStatus("idle"),
        rate: 1.0,
        pitch: 1.05,
    });

    // ── Core pipeline ──────────────────────────────────────────────
    const handleUserSpeech = useCallback(
        async (transcript: string) => {
            if (!transcript.trim() || processingRef.current) return;
            processingRef.current = true;

            try {
                stop();
                addMessage({ role: "user", content: transcript });
                setStatus("thinking");

                const response = await chatWithAgent(
                    transcript,
                    sessionId,
                    conversationHistory
                );

                if (!sessionId && response.session_id) {
                    setSessionId(response.session_id);
                }

                setLeadScore(response.lead_score);
                setQualificationData(response.qualification_data);
                addToHistory("user", transcript);
                addToHistory("assistant", response.reply);
                addMessage({ role: "aria", content: response.reply });
                setStatus("speaking");
                speak(response.reply);

            } catch (error) {
                const msg =
                    error instanceof Error
                        ? error.message
                        : "Connection error. Is the backend running at localhost:8000?";
                addMessage({ role: "system", content: `❌ ${msg}` });
                setStatus("idle");
            } finally {
                processingRef.current = false;
            }
        },
        [
            sessionId, conversationHistory,
            addMessage, setSessionId, setLeadScore,
            setQualificationData, setStatus, addToHistory,
            speak, stop,
        ]
    );

    // ── STT ────────────────────────────────────────────────────────
    const { isListening, isSupported, startListening, stopListening } =
        useSpeechRecognition({
            onResult: handleUserSpeech,
            onError: (err) => {
                addMessage({ role: "system", content: `🎤 ${err}` });
                setStatus("idle");
            },
            lang: "en-US",
            continuous: false,
        });

    const handleStart = useCallback(() => {
        if (isSpeaking) stop();
        setStatus("listening");
        startListening();
    }, [isSpeaking, stop, setStatus, startListening]);

    const handleStop = useCallback(() => {
        stopListening();
        setStatus("idle");
    }, [stopListening, setStatus]);

    const sendTextMessage = useCallback(
        async (text: string) => {
            if (!text.trim()) return;
            await handleUserSpeech(text);
        },
        [handleUserSpeech]
    );

    const resetSession = useCallback(() => {
        stop();
        stopListening();
        storeReset();
    }, [stop, stopListening, storeReset]);

    return {
        isListening,
        isSpeaking,
        isSupported,
        startListening: handleStart,
        stopListening: handleStop,
        sendTextMessage,
        resetSession,
    };
}