import { apiRequest } from "./http";
import type { ApiEnvelope } from "@/types/api";

export interface AiChatRequest {
  message: string;
  month?: number;
  year?: number;
}

export interface AiChatResponse {
  answer: string;
  metadata?: {
    periodLabel?: string;
    usedContextMonth?: number;
    usedContextYear?: number;
  } | null;
  scope: "dashboard";
  usage?: {
    remainingDaily: number;
    remainingWindow: number;
    windowResetAt: string;
  } | null;
}

export const aiApi = {
  chat(input: AiChatRequest) {
    return apiRequest<ApiEnvelope<AiChatResponse>>("/ai/chat", {
      body: input,
      method: "POST"
    });
  }
};
