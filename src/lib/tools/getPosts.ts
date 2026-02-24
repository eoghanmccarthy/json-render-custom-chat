import { tool } from "ai";
import { z } from "zod";

export const getPosts = tool({
  description:
    "Fetch all blog posts. Call this when the user wants to see, list, or browse their posts.",
  inputSchema: z.object({
    limit: z.number().optional().describe("Max number of posts to return"),
  }),
  execute: async ({ limit }) => {
    try {
      const query = limit ? `?limit=${limit}` : "";
      // const res = await fetch(`${process.env.BLOG_API_BASE}/v1/posts${query}`);
      const res = await fetch(`${process.env.BLOG_API_BASE}/posts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to fetch posts");
      return { posts: json };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to fetch posts" };
    }
  },
});
