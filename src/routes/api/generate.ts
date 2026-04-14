import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { pipeJsonRender } from "@json-render/core";

import { agent } from "@/lib/agent";

export const maxDuration = 30;

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const uiMessages: Array<UIMessage> = body.messages;

        if (!uiMessages || !Array.isArray(uiMessages) || uiMessages.length === 0) {
          return new Response(JSON.stringify({ error: "messages array is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const modelMessages = await convertToModelMessages(uiMessages);
        // Calls the LLM API via ToolLoopAgent (model + API key configured in src/lib/agent.ts)
        const result = await agent.stream({ messages: modelMessages });

        // Wraps the LLM stream into the AI SDK UI message format that useChat expects on the client
        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.merge(pipeJsonRender(result.toUIMessageStream()));
          },
          onFinish: async ({ messages }) => {
            console.log("Generated messages:", JSON.stringify(messages, null, 2));
            // TODO: save messages to DB
            // e.g. await db.saveMessages(chatId, messages);
          },
        });

        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
