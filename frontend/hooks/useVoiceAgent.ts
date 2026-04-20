// FILE PATH: voice-lead-agent/frontend/hooks/useVoiceAgent.ts
//
// WHY THIS FILE EXISTS:
//   This is the BRAIN of the voice agent. It connects:
//
//   useSpeechRecognition → hears the user
//   api.chatWithAgent()  → sends to backend / Groq
//   useSpeechSynthesis   → speaks Aria's reply
//   useAgentStore        → updates all UI state
//
//   Without this hook, you'd put all this logic in a component,
//   which would mix UI code with business logic (bad practice).
//
// THE FULL PIPELINE (what happens every time the user speaks):
//
//   User speaks
//     ↓ useSpeechRecognition fires onResult(transcript)
//     ↓ handleUserSpeech() is called
//     ↓ Adds user message to chat (store.addMessage)
//     ↓ Sets status → "thinking" (orb shows thinking animation)
//     ↓ Calls chatWithAgent(transcript, sessionId, history)
//     ↓ Backend: Groq LLM generates Aria's reply
//     ↓ Response arrives: reply + lead_score + qualification_data
//     ↓ Stores sessionId (for future messages)
//     ↓ Updates lead score in store
//     ↓ Adds Aria's message to chat
//     ↓ Sets status → "speaking"
//     ↓ useSpeechSynthesis.speak(reply) → Aria speaks
//     ↓ TTS onEnd fires
//     ↓ Sets status → "idle" (mic can be pressed again)

"use client";

import { useCallback, useRef } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useSpeechSynthesis } from "./useSpeechSynthesis";
import { useAgentStore } from "@/store/agentStore";
import { chatWithAgent } from "@/lib/api";

// ── Hook return type ────────────────────────────────────────────
export interface UseVoiceAgentReturn {
  // Mic controls — wired to MicButton component
  isListening: boolean;
  isSpeaking: boolean;
  isSupported: boolean;       // Web Speech API supported?
  startListening: () => void;
  stopListening: () => void;

  // Text input fallback — for browsers without mic support
  sendTextMessage: (text: string) => Promise<void>;

  // Session control
  resetSession: () => void;
}

// ── The hook ────────────────────────────────────────────────────
export function useVoiceAgent(): UseVoiceAgentReturn {

  // ── Store actions ─────────────────────────────────────────────
  // Destructure only what we need — prevents unnecessary re-renders
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

  // Prevent duplicate API calls if user speaks twice quickly
  // useRef doesn't cause re-renders, perfect for a flag like this
  const isProcessingRef = useRef(false);

  // ── TTS setup ─────────────────────────────────────────────────
  // onEnd fires when Aria finishes speaking → return to idle
  const { isSpeaking, speak, stop } = useSpeechSynthesis({
    onEnd: () => {
      setStatus("idle");
    },
    rate: 1.0,
    pitch: 1.05,
  });

  // ── Core pipeline ─────────────────────────────────────────────
  // This function runs every time the user finishes speaking a sentence
  const handleUserSpeech = useCallback(
    async (transcript: string) => {
      // Guard: don't process empty transcripts or if already processing
      if (!transcript.trim() || isProcessingRef.current) return;

      isProcessingRef.current = true;

      try {
        // 1. Stop TTS if Aria was still speaking (user interrupted)
        stop();

        // 2. Show user message in chat immediately (feels responsive)
        addMessage({ role: "user", content: transcript });

        // 3. Set status → "thinking" (orb animation changes)
        setStatus("thinking");

        // 4. Call the backend API
        //    sessionId is null on first message → backend creates one
        //    conversationHistory gives LLM context of previous turns
        const response = await chatWithAgent(
          transcript,
          sessionId,
          conversationHistory
        );

        // 5. Store the session ID from first response
        //    All subsequent calls will include this ID
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id);
        }

        // 6. Update lead qualification state → UI badge and strip update
        setLeadScore(response.lead_score);
        setQualificationData(response.qualification_data);

        // 7. Add Aria's reply to conversation history
        //    (sent to backend on next turn for LLM context)
        addToHistory("user", transcript);
        addToHistory("assistant", response.reply);

        // 8. Show Aria's reply in chat panel
        addMessage({ role: "aria", content: response.reply });

        // 9. Set status → "speaking" then trigger TTS
        setStatus("speaking");
        speak(response.reply);
        // When TTS finishes, useSpeechSynthesis.onEnd sets status → "idle"

      } catch (error) {
        // Something went wrong (network, API key, backend down)
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Connection error. Is the backend running?";

        addMessage({
          role: "system",
          content: `❌ ${errorMsg}`,
        });

        setStatus("idle");
      } finally {
        // Always release the processing lock
        isProcessingRef.current = false;
      }
    },
    // Dependencies: everything this function uses from outer scope
    [
      sessionId,
      conversationHistory,
      addMessage,
      setSessionId,
      setLeadScore,
      setQualificationData,
      setStatus,
      addToHistory,
      speak,
      stop,
    ]
  );

  // ── STT setup ─────────────────────────────────────────────────
  // onResult is called when the user finishes speaking a sentence
  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleUserSpeech,
      onError: (error) => {
        addMessage({ role: "system", content: `🎤 ${error}` });
        setStatus("idle");
      },
      lang: "en-US",
      continuous: false, // One sentence at a time
    });

  // ── Wrap startListening to also update status ─────────────────
  const handleStartListening = useCallback(() => {
    if (isSpeaking) stop(); // Stop Aria if she's still talking
    setStatus("listening");
    startListening();
  }, [isSpeaking, stop, setStatus, startListening]);

  const handleStopListening = useCallback(() => {
    stopListening();
    setStatus("thinking"); // Will become idle if no speech detected
  }, [stopListening, setStatus]);

  // ── Text input fallback ───────────────────────────────────────
  // For browsers that don't support Web Speech API (Firefox, Safari)
  // Users can type their message instead
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await handleUserSpeech(text);
    },
    [handleUserSpeech]
  );

  // ── Reset session ─────────────────────────────────────────────
  const resetSession = useCallback(() => {
    stop();            // Stop any ongoing speech
    stopListening();   // Stop microphone
    storeReset();      // Clear all state in Zustand store
  }, [stop, stopListening, storeReset]);

  return {
    isListening,
    isSpeaking,
    isSupported,
    startListening: handleStartListening,
    stopListening: handleStopListening,
    sendTextMessage,
    resetSession,
  };
}