import { tool } from "ai";
import { z } from "zod";

export const getPost = tool({
  description:
    "Fetch a single blog post by ID. Call this when the user wants to view or edit a specific post.",
  inputSchema: z.object({
    id: z.string().describe("The post ID to fetch"),
  }),
  execute: async ({ id }) => {
    try {
      // const res = await fetch(`${process.env.BLOG_API_BASE}/v1/posts/${id}`);
      const res = await fetch(`${process.env.BLOG_API_BASE}/posts/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch post");
      return { post: json };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to fetch post" };
    }
  },
});
