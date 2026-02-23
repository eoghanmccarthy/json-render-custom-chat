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
        const result = await agent.stream({ messages: modelMessages });

        const stream = createUIMessageStream({
          execute: async ({ writer }) => {
            writer.merge(pipeJsonRender(result.toUIMessageStream()));
          },
        });

        return createUIMessageStreamResponse({ stream });
      },
    },
  },
});
