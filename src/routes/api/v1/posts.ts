import { createFileRoute } from "@tanstack/react-router";

import { baseHeaders, forward } from "@/routes/api/-utils";

export const Route = createFileRoute("/api/v1/posts")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const upstream = process.env.BLOG_API_BASE;
        if (!upstream) {
          return Response.json({ error: "BLOG_API_BASE not set" }, { status: 500 });
        }

        const url = new URL(request.url);
        const qs = url.search;
        const res = await fetch(`${upstream}/posts${qs}`, {
          headers: baseHeaders("GET"),
        });
        return forward(res);
      },
      POST: async ({ request }) => {
        const upstream = process.env.BLOG_API_BASE;
        if (!upstream) {
          return Response.json({ error: "BLOG_API_BASE not set" }, { status: 500 });
        }

        const { content } = await request.json();
        console.log("Received content for new post:", content);

        // Build FormData
        const formData = new FormData();
        formData.append("content", content);

        const res = await fetch(`${upstream}/posts/create`, {
          method: "POST",
          headers: { ...baseHeaders("POST") },
          body: formData,
        });
        return forward(res);
      },
    },
  },
});
