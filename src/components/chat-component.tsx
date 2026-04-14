"use client";

import { useCallback, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { SPEC_DATA_PART_TYPE } from "@json-render/core";
import type { SpecDataPart, SPEC_DATA_PART } from "@json-render/core";
import { useJsonRenderMessage } from "@json-render/react";
import { ChevronRight, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

import { ExplorerRenderer } from "@/lib/render/renderer";

import { SpeechInput, type SpeechInputHandle } from "@/components/ai-elements/speech-input";
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputProvider,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

// =============================================================================
// Types
// =============================================================================

type AppDataParts = { [SPEC_DATA_PART]: SpecDataPart };
type AppMessage = UIMessage<unknown, AppDataParts>;

// =============================================================================
// Transport
// =============================================================================

const transport = new DefaultChatTransport({ api: "/api/generate" });

// =============================================================================
// Suggestions (shown in empty state)
// =============================================================================

const SUGGESTIONS = [
  {
    label: "All posts",
    prompt: "Show me all my blog posts",
  },
  {
    label: "New post",
    prompt: "I want to create a new blog post",
  },
  {
    label: "Delete a post",
    prompt: "I need to delete a post",
  },
];

// =============================================================================
// Tool Call Display
// =============================================================================

/** Readable labels for tool names: [loading, done] */
const TOOL_LABELS: Record<string, [string, string]> = {
  getPosts: ["Fetching posts", "Fetched posts"],
  getPost: ["Fetching post", "Fetched post"],
};

function ToolCallDisplay({
  toolName,
  state,
  result,
}: {
  toolName: string;
  state: string;
  result: unknown;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading =
    state !== "output-available" && state !== "output-error" && state !== "output-denied";
  const labels = TOOL_LABELS[toolName];
  const label = labels ? (isLoading ? labels[0] : labels[1]) : toolName;

  return (
    <div className="text-sm group">
      <button
        type="button"
        className="flex items-center gap-1.5"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={`text-muted-foreground ${isLoading ? "animate-shimmer" : ""}`}>
          {label}
        </span>
        {!isLoading && (
          <ChevronRight
            className={`h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ${expanded ? "rotate-90" : ""}`}
          />
        )}
      </button>
      {expanded && !isLoading && result != null && (
        <div className="mt-1 max-h-64 overflow-auto">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Message Bubble
// =============================================================================

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: AppMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const { spec, text, hasSpec } = useJsonRenderMessage(message.parts);

  // Build ordered segments from parts, collapsing adjacent text and adjacent tools.
  // Spec data parts are tracked so the rendered UI appears inline where the AI
  // placed it rather than always at the bottom.
  const segments: Array<
    | { kind: "text"; text: string }
    | {
        kind: "tools";
        tools: Array<{
          toolCallId: string;
          toolName: string;
          state: string;
          output?: unknown;
        }>;
      }
    | { kind: "spec" }
  > = [];

  let specInserted = false;

  for (const part of message.parts) {
    if (part.type === "text") {
      if (!part.text.trim()) continue;
      const last = segments[segments.length - 1];
      if (last?.kind === "text") {
        last.text += part.text;
      } else {
        segments.push({ kind: "text", text: part.text });
      }
    } else if (part.type.startsWith("tool-")) {
      const tp = part as {
        type: string;
        toolCallId: string;
        state: string;
        output?: unknown;
      };
      const last = segments[segments.length - 1];
      if (last?.kind === "tools") {
        last.tools.push({
          toolCallId: tp.toolCallId,
          toolName: tp.type.replace(/^tool-/, ""),
          state: tp.state,
          output: tp.output,
        });
      } else {
        segments.push({
          kind: "tools",
          tools: [
            {
              toolCallId: tp.toolCallId,
              toolName: tp.type.replace(/^tool-/, ""),
              state: tp.state,
              output: tp.output,
            },
          ],
        });
      }
    } else if (part.type === SPEC_DATA_PART_TYPE && !specInserted) {
      // First spec data part — mark where the rendered UI should appear
      segments.push({ kind: "spec" });
      specInserted = true;
    }
  }

  const hasAnything = segments.length > 0 || hasSpec;
  const showLoader = isLast && isStreaming && message.role === "assistant" && !hasAnything;

  if (isUser) {
    return (
      <div className="flex justify-end">
        {text && (
          <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-tr-md">
            {text}
          </div>
        )}
      </div>
    );
  }

  // If there's a spec but no spec segment was inserted (edge case),
  // append it so it still renders.
  const specRenderedInline = specInserted;
  const showSpecAtEnd = hasSpec && !specRenderedInline;

  return (
    <div className="w-full flex flex-col gap-3">
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          const isLastSegment = i === segments.length - 1;
          return (
            <div
              key={`text-${i}`}
              className="text-sm leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-2 [&_ol]:mt-2 [&_pre]:mt-2"
            >
              <Streamdown plugins={{ code }} animated={isLast && isStreaming && isLastSegment}>
                {seg.text}
              </Streamdown>
            </div>
          );
        }
        if (seg.kind === "spec") {
          if (!hasSpec) return null;
          return (
            <div key="spec" className="w-full">
              <ExplorerRenderer spec={spec} loading={isLast && isStreaming} />
            </div>
          );
        }
        return (
          <div key={`tools-${i}`} className="flex flex-col gap-1">
            {seg.tools.map((t) => (
              <ToolCallDisplay
                key={t.toolCallId}
                toolName={t.toolName}
                state={t.state}
                result={t.output}
              />
            ))}
          </div>
        );
      })}

      {/* Loading indicator */}
      {showLoader && (
        <div className="text-sm text-muted-foreground animate-shimmer">Thinking...</div>
      )}

      {/* Fallback: render spec at end if no inline position was found */}
      {showSpecAtEnd && (
        <div className="w-full">
          <ExplorerRenderer spec={spec} loading={isLast && isStreaming} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Chat Input (inner — needs access to PromptInputProvider context)
// =============================================================================

function ChatInput({
  speechInputRef,
  status,
  stop,
  isStreaming,
  isEmpty,
  onSubmit,
}: {
  speechInputRef: React.RefObject<SpeechInputHandle | null>;
  status: ReturnType<typeof useChat>["status"];
  stop: () => void;
  isStreaming: boolean;
  isEmpty: boolean;
  onSubmit: (message: PromptInputMessage) => Promise<void>;
}) {
  const { textInput, attachments } = usePromptInputController();

  const handleTranscription = useCallback(
    (text: string) => {
      textInput.setInput(textInput.value ? `${textInput.value} ${text}` : text);
    },
    [textInput],
  );

  return (
    <PromptInput
      className="max-w-3xl mx-auto rounded-xl bg-background shadow-md border"
      onSubmit={onSubmit}
    >
      {attachments.files.length > 0 && (
          <div className="p-3 pb-2 w-full">
            <Attachments variant="grid" className="mr-auto ml-0">
              {attachments.files.map((file) => (
                  <Attachment key={file.id} data={file} onRemove={() => attachments.remove(file.id)}>
                    <AttachmentPreview />
                    <AttachmentInfo />
                    <AttachmentRemove />
                  </Attachment>
              ))}
            </Attachments>
          </div>
      )}
      <PromptInputTextarea
        placeholder={isEmpty ? "e.g., Show me all my blog posts..." : "Ask a follow-up..."}
        autoFocus
      />
      <PromptInputFooter>
        <PromptInputTools>
          <SpeechInput
            ref={speechInputRef}
            onTranscriptionChange={handleTranscription}
            size="icon-sm"
            variant="ghost"
            disabled={isStreaming}
          />
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent side="top" className="min-w-48">
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputSubmit
          status={status}
          onStop={stop}
          disabled={!textInput.value.trim() && !isStreaming}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}

// =============================================================================
// Page
// =============================================================================

export function ChatComponent() {
  const speechInputRef = useRef<SpeechInputHandle>(null);

  const { messages, sendMessage, setMessages, status, stop, error } = useChat<AppMessage>({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  const handleSuggestion = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;
      speechInputRef.current?.stop();
      await sendMessage({ text: text.trim() });
    },
    [isStreaming, sendMessage],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted/40">
      {/* Header */}
      <header className="border-b px-6 h-14 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      {/* Messages area */}
      <Conversation className="flex-1">
        {isEmpty ? (
          <ConversationContent className="min-h-full">
            <ConversationEmptyState>
              <div className="max-w-2xl w-full space-y-8">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold tracking-tight">What would you like to do today?</h2>
                </div>
                <Suggestions className="w-full justify-center">
                  {SUGGESTIONS.map((s) => (
                    <Suggestion
                      key={s.label}
                      suggestion={s.prompt}
                      onClick={handleSuggestion}
                    >
                      <Sparkles className="h-3 w-3" />
                      {s.label}
                    </Suggestion>
                  ))}
                </Suggestions>
              </div>
            </ConversationEmptyState>
          </ConversationContent>
        ) : (
          <ConversationContent className="max-w-3xl mx-auto px-10 py-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            )}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>

      {/* Input bar */}
      <div className="px-6 pb-12 flex-shrink-0">
        <PromptInputProvider>
          <ChatInput
            speechInputRef={speechInputRef}
            status={status}
            stop={stop}
            isStreaming={isStreaming}
            isEmpty={isEmpty}
            onSubmit={async ({ text, files }) => {
              if (!text.trim() && files.length === 0) return;
              speechInputRef.current?.stop();
              await sendMessage({
                text: text.trim(),
                files,
              });
            }}
          />
        </PromptInputProvider>
      </div>
    </div>
  );
}
