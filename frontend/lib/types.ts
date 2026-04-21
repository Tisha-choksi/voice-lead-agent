export type LeadScore         = "HOT" | "WARM" | "COLD";
export type ConversationStage = "greeting" | "discovery" | "qualification" | "closing";
export type AgentStatus       = "idle" | "listening" | "thinking" | "speaking";

export interface Message {
  id:        string;
  role:      "user" | "aria" | "system";
  content:   string;
  timestamp: Date;
}

export interface QualificationData {
  intent:             string;
  budget:             string;
  timeline:           string;
  is_decision_maker:  boolean | "unknown";
  lead_score:         LeadScore;
  conversation_stage: ConversationStage;
}

export interface ChatRequest {
  message:              string;
  session_id:           string | null;
  conversation_history: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface ChatResponse {
  reply:              string;
  session_id:         string;
  lead_score:         LeadScore;
  qualification_data: QualificationData;
  conversation_stage: ConversationStage;
}

export interface Lead {
  id:                 number;
  session_id:         string;
  first_message:      string;
  name:               string;
  phone:              string | null;
  email:              string | null;
  lead_score:         LeadScore;
  qualification_data: QualificationData | string | null;
  created_at:         string;
  updated_at:         string;
}

export interface LeadsResponse { leads: Lead[]; total: number; }
export interface LeadStats     { total: number; hot: number; warm: number; cold: number; }
export interface ApiError      { detail: string; }
