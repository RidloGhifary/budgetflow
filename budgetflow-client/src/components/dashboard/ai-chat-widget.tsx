"use client";

import { FormEvent, KeyboardEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

import { SensitiveText } from "@/components/privacy/sensitive-value";
import { formatMonthYear, getCurrentMonthYear } from "@/components/shared/month-year-selector";
import { Button } from "@/components/ui/button";
import { aiApi } from "@/lib/api/ai.api";
import { getFriendlyApiError } from "@/lib/api/http";
import { cn } from "@/lib/utils";

interface AiChatWidgetProps {
  month?: number;
  periodLabel?: string;
  year?: number;
}

interface ChatMessage {
  content: string;
  id: string;
  role: "assistant" | "user";
}

const suggestedQuestions = [
  "Summarize my dashboard",
  "What is my biggest expense?",
  "Am I over budget?",
  "How is my cash flow this month?",
  "What should I pay attention to?"
];

export function AiChatWidget({ month, periodLabel, year }: AiChatWidgetProps) {
  const defaultPeriod = useMemo(() => getCurrentMonthYear(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const selectedMonth = month ?? defaultPeriod.month;
  const selectedYear = year ?? defaultPeriod.year;
  const canSend = input.trim().length > 0 && !isSending;
  const subtitle = useMemo(
    () => `Analyzing ${periodLabel ?? formatMonthYear(selectedMonth, selectedYear)}`,
    [periodLabel, selectedMonth, selectedYear]
  );

  const sendMessage = async (message: string) => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    setErrorMessage(null);
    setInput("");
    setIsSending(true);

    const userMessage: ChatMessage = {
      content: trimmedMessage,
      id: crypto.randomUUID(),
      role: "user"
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const response = await aiApi.chat({ message: trimmedMessage, month: selectedMonth, year: selectedYear });
      const assistantMessage: ChatMessage = {
        content: response.data.answer,
        id: crypto.randomUUID(),
        role: "assistant"
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      const messageText = getFriendlyApiError(error, "aiChat");
      setErrorMessage(messageText);
      setMessages((current) => [
        ...current,
        {
          content: messageText,
          id: crypto.randomUUID(),
          role: "assistant"
        }
      ]);
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-30 sm:bottom-5 sm:left-auto sm:right-5">
      {isOpen ? (
        <div className="flex h-[min(78vh,620px)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] flex-col rounded-xl border border-border bg-card shadow-2xl sm:h-[620px] sm:max-h-[calc(100vh-2.5rem)] sm:w-[440px]">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <Image
                alt="BudgetFlow AI"
                className="h-9 w-9 rounded-lg border border-border bg-card object-cover shadow-sm"
                height={36}
                src="/icon.png"
                width={36}
              />
              <div>
                <p className="font-semibold text-foreground">BudgetFlow AI</p>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            <Button aria-label="Close AI chat" onClick={() => setIsOpen(false)} size="icon" type="button" variant="ghost">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles className="h-4 w-4" />
                    Ask about your BudgetFlow dashboard
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    I can explain your income, spending, budgets, debts, saving goals, and cash flow for the selected period.
                  </p>
                </div>
                <div className="space-y-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      className="w-full rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/30 hover:bg-secondary"
                      onClick={() => void sendMessage(question)}
                      type="button"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[86%] rounded-lg px-3 py-2 text-sm leading-6",
                      message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    )}
                  >
                    {message.role === "assistant" ? <SensitiveText text={message.content} /> : message.content}
                  </div>
                </div>
              ))
            )}
            {isSending ? <p className="text-xs text-muted-foreground">Analyzing your dashboard...</p> : null}
            {errorMessage ? <p className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">{errorMessage}</p> : null}
          </div>

          <form className="space-y-3 border-t border-border p-5" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="min-h-24 w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSending}
              maxLength={500}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about spending, budget risk, cash flow..."
              value={input}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{input.length}/500</span>
              <Button disabled={!canSend} type="submit">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <Button className="h-12 rounded-full px-4 shadow-xl" onClick={() => setIsOpen(true)} type="button">
          <MessageCircle className="h-4 w-4" />
          Ask AI
        </Button>
      )}
    </div>
  );
}
