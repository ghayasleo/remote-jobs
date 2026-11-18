import { getLlmsText } from "@/lib/data/llms";

// A guide to the site for AI assistants (llmstxt.org). Prerendered and
// refreshed with the hourly role data.
export async function GET() {
  return new Response(await getLlmsText(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
