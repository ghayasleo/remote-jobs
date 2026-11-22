import { createMcpHandler } from "mcp-handler";
import { SERVER_INFO, SERVER_INSTRUCTIONS, registerTools } from "@/lib/mcp/server";

// The MCP server: AI assistants (Claude, ChatGPT, Cursor, VS Code…) connect to
// https://remotejobs.ghayasuddin.net/mcp to search this site's companies and
// remote roles. Streamable HTTP, stateless (no sessions or storage), read-only
// and public, so there's no login. The /ai page explains how to add it.

const mcp = createMcpHandler(registerTools, { serverInfo: SERVER_INFO, instructions: SERVER_INSTRUCTIONS });

// The data is public and nothing uses cookies, so browser-based clients may call it from anywhere.
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
  "access-control-max-age": "86400",
};

async function handle(request: Request) {
  const response = await mcp(request);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function GET(request: Request) {
  // Someone opening the address in a browser gets the page that explains it.
  if (request.headers.get("accept")?.includes("text/html")) {
    return Response.redirect(new URL("/ai", request.url), 307);
  }
  return handle(request);
}

export { handle as POST, handle as DELETE };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
