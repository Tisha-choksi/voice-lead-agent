"use client";

// Main orchestrator hook.
// Pipeline: User speaks → SSE stream (Sarvam tokens) → typing effect → Edge TTS plays

import { useCallback, useRef, useState } from "react";
import { useSpeechRecognition } from "./useSpeechRecognition";
import { useEdgeTTS }           from "./useEdgeTTS";
import { useAgentStore }        from "@/store/agentStore";

const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export interface UseVoiceAgentReturn {
  isListening:    boolean;
  isSpeaking:     boolean;
  isStreaming:     boolean;
  isSupported:    boolean;
  startListening: () => void;
  stopListening:  () => void;
  sendTextMessage:(text: string) => Promise<void>;
  resetSession:   () => void;
}

export function useVoiceAgent(): UseVoiceAgentReturn {
  const {
    addMessage, updateLastAriaMessage,
    setSessionId, setLeadScore, setQualificationData,
    setStatus, resetSession: storeReset,
    sessionId, conversationHistory, addToHistory,
  } = useAgentStore();

  const processingRef  = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const { isSpeaking, playAudio, stopAudio } = useEdgeTTS(() => setStatus("idle"));

  // ── Core pipeline ─────────────────────────────────────────────
  const handleUserSpeech = useCallback(async (transcript: string) => {
    if (!transcript.trim() || processingRef.current) return;
    processingRef.current = true;

    try {
      stopAudio();
      addMessage({ role: "user", content: transcript });
      setStatus("thinking");
      // Add empty Aria bubble — we'll fill it token by token
      addMessage({ role: "aria", content: "" });

      const res = await fetch(`${BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:              transcript,
          session_id:           sessionId,
          conversation_history: conversationHistory.slice(-10),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Backend error: ${res.status}`);

      setStatus("speaking");
      setIsStreaming(true);

      // ── Read SSE stream ───────────────────────────────────────
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") break;

          try {
            const data = JSON.parse(raw);

            switch (data.type) {
              case "token":
                // Append token to the Aria bubble in real time (typing effect)
                fullReply += data.content;
                updateLastAriaMessage(fullReply);
                break;

              case "done":
                if (data.session_id && !sessionId) setSessionId(data.session_id);
                if (data.lead_score)         setLeadScore(data.lead_score);
                if (data.qualification_data) setQualificationData(data.qualification_data);
                addToHistory("user", transcript);
                addToHistory("assistant", data.reply || fullReply);
                setIsStreaming(false);
                break;

              case "audio":
                // Play Edge TTS neural audio — human quality
                if (data.audio) await playAudio(data.audio);
                break;

              case "error":
                addMessage({ role: "system", content: `❌ ${data.message}` });
                setStatus("idle");
                break;
            }
          } catch { /* skip malformed chunk */ }
        }
      }

      if (!isSpeaking) setStatus("idle");

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection error. Is the backend running?";
      addMessage({ role: "system", content: `❌ ${msg}` });
      setStatus("idle");
    } finally {
      setIsStreaming(false);
      processingRef.current = false;
    }
  }, [
    sessionId, conversationHistory,
    addMessage, updateLastAriaMessage,
    setSessionId, setLeadScore, setQualificationData,
    setStatus, addToHistory, playAudio, stopAudio, isSpeaking,
  ]);

  // ── STT ──────────────────────────────────────────────────────
  const { isListening, isSupported, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleUserSpeech,
      onError:  (err) => { addMessage({ role: "system", content: `🎤 ${err}` }); setStatus("idle"); },
      lang:     "en-IN",
      continuous: false,
    });

  const handleStart = useCallback(() => {
    if (isSpeaking) stopAudio();
    setStatus("listening");
    startListening();
  }, [isSpeaking, stopAudio, setStatus, startListening]);

  const handleStop = useCallback(() => {
    stopListening();
    setStatus("idle");
  }, [stopListening, setStatus]);

  const sendTextMessage = useCallback(
    async (text: string) => { if (text.trim()) await handleUserSpeech(text); },
    [handleUserSpeech]
  );

  const resetSession = useCallback(() => {
    stopAudio(); stopListening(); storeReset();
  }, [stopAudio, stopListening, storeReset]);

  return {
    isListening, isSpeaking, isStreaming, isSupported,
    startListening: handleStart,
    stopListening:  handleStop,
    sendTextMessage, resetSession,
  };
}
