import type { Metadata } from "next";
import { BotIcon, PlugIcon } from "lucide-react";
import { CodeSnippet } from "@/components/code-snippet";
import { CopyAddressButton } from "@/components/copy-feed-button";
import { DEFAULT_OG_IMAGE, OG_BASE, absoluteUrl } from "@/lib/site";

// How to use the MCP server (app/mcp/route.ts) from an AI assistant. Opening
// /mcp in a browser lands here, and "Use with AI" in the menu links here.

const title = "Remote jobs MCP server for Claude, ChatGPT and more";
const description =
  "Search remote-friendly tech companies, open remote roles and salaries from Claude, ChatGPT, VS Code or Cursor. Remote Jobs has a free MCP server: no account or key.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ai" },
  openGraph: { ...OG_BASE, title, description, url: "/ai", images: [DEFAULT_OG_IMAGE] },
};

const MCP_URL = absoluteUrl("/mcp");

const PROMPTS = [
  "Find senior backend roles open to people in Pakistan, posted this week.",
  "Which companies hiring right now work with Rust?",
  "What do remote product designers earn?",
  "Tell me about GitLab: how they work remotely and what they’re hiring for.",
  "How is remote tech hiring looking this month?",
];

const TOOLS: [name: string, does: string][] = [
  ["search_jobs", "Open remote roles by words, kind of work, region, country, date posted, pay, company size and stack."],
  ["search_companies", "Remote-friendly companies by words, where they hire, remote policy, size and stack."],
  ["get_company", "One company’s profile, how to apply, and its open remote roles."],
  ["get_job", "One role in full, checked live on the company’s job board, with the link to apply."],
  ["salary_insights", "What remote roles pay, from the postings that publish a range."],
  ["market_overview", "Who’s hiring, how many remote roles are open, and how often pay is published."],
];

const CURSOR_CONFIG = JSON.stringify({ mcpServers: { remotejobs: { url: MCP_URL } } }, null, 2);

/** A menu item or button, as the app names it. */
function Ui({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>;
}

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-4">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t pt-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function App({ name, help, children }: { name: string; help?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5 pt-2">
      <h3 className="font-semibold">{name}</h3>
      {children}
      {help && (
        <p className="text-sm text-muted-foreground">
          Menus move around: <External href={help.href}>{help.label}</External> has the latest steps.
        </p>
      )}
    </div>
  );
}

const steps = "list-decimal space-y-1.5 pl-5 marker:text-muted-foreground";

export default function AiPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <BotIcon className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-balance sm:text-3xl">Search remote jobs from your AI assistant</h1>
      <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-foreground/90">
        Add Remote Jobs to Claude, ChatGPT, VS Code or Cursor and ask for roles in plain words. It searches the same
        companies and remote roles you see here, and links back to them. Free, with no account or key.
      </p>

      <div className="mt-6 rounded-2xl border p-4">
        <p className="text-sm font-medium text-muted-foreground">The address to add</p>
        <code className="mt-1 block font-mono text-base font-semibold break-all">{MCP_URL}</code>
        <CopyAddressButton
          path="/mcp"
          icon={<PlugIcon aria-hidden />}
          what="MCP address"
          hint="Paste it into your AI assistant as a custom connector or remote MCP server."
          className="mt-3"
        >
          Copy address
        </CopyAddressButton>
      </div>

      <div className="mt-10 space-y-10">
        <Section title="What you can ask">
          <ul className="flex flex-col items-start gap-2">
            {PROMPTS.map((prompt) => (
              <li key={prompt} className="max-w-[34rem] rounded-2xl rounded-bl-md bg-secondary px-4 py-2.5 text-secondary-foreground">
                {prompt}
              </li>
            ))}
          </ul>
          <p>Answers come with links to each company and role here, so you can read the full page and apply.</p>
        </Section>

        <Section title="Add it to your assistant">
          <App name="Claude" help={{ href: "https://support.claude.com/en/articles/11175166", label: "Claude’s guide" }}>
            <ol className={steps}>
              <li>
                Open <Ui>Customize → Connectors</Ui>, choose <Ui>Add</Ui>, then <Ui>Add custom connector</Ui>.
              </li>
              <li>
                Name it Remote Jobs, paste the address, and choose <Ui>Continue</Ui>.
              </li>
              <li>
                For sign-in, choose <Ui>No sign-in</Ui>, then <Ui>Add</Ui>.
              </li>
              <li>
                In a chat, turn it on under <Ui>+ → Connectors</Ui>.
              </li>
            </ol>
            <p className="text-sm text-muted-foreground">
              The free plan allows one custom connector. On Team and Enterprise plans, an owner adds it under Organization
              settings → Connectors.
            </p>
          </App>

          <App name="ChatGPT" help={{ href: "https://help.openai.com/en/articles/12584461", label: "OpenAI’s guide" }}>
            <ol className={steps}>
              <li>
                Open <Ui>Plugins</Ui>, choose <Ui>+</Ui>, then <Ui>Add custom MCP server</Ui>.
              </li>
              <li>
                Name it Remote Jobs and paste the address as the <Ui>Server URL</Ui>.
              </li>
              <li>
                Choose <Ui>No authentication</Ui>, confirm, then create and install it.
              </li>
              <li>
                In a chat, type <Ui>@</Ui> and pick Remote Jobs.
              </li>
            </ol>
            <p className="text-sm text-muted-foreground">Custom MCP servers work in ChatGPT on the web, on plans that allow them.</p>
          </App>

          <App name="Claude Code">
            <p>Run this in your terminal:</p>
            <CodeSnippet what="command" code={`claude mcp add --transport http remotejobs ${MCP_URL}`} />
          </App>

          <App
            name="VS Code"
            help={{ href: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers", label: "VS Code’s guide" }}
          >
            <p>
              Run <Ui>MCP: Add Server</Ui> from the Command Palette, choose <Ui>HTTP</Ui>, and paste the address.
            </p>
          </App>

          <App name="Cursor" help={{ href: "https://cursor.com/docs/context/mcp", label: "Cursor’s guide" }}>
            <p>
              Add this to <code className="rounded bg-muted px-1.5 py-0.5 text-sm">~/.cursor/mcp.json</code>, or to{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.cursor/mcp.json</code> in a project:
            </p>
            <CodeSnippet what="configuration" code={CURSOR_CONFIG} />
          </App>

          <App name="Anything else">
            <p>Any app that connects to remote MCP servers over Streamable HTTP works the same way: give it the address. No key is needed.</p>
          </App>
        </Section>

        <Section title="Good to know">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
            <li>It’s read-only. Your assistant can look things up, but it can’t apply, save or change anything.</li>
            <li>
              It answers from the same data as this site: companies from the community-run remoteintech/remote-jobs list,
              and open roles from their job boards, refreshed every hour.
            </li>
            <li>No account, no key and no cost.</li>
          </ul>
        </Section>

        <Section title="What it can do">
          <p>For the curious, these are the tools your assistant gets:</p>
          <dl className="space-y-3">
            {TOOLS.map(([name, does]) => (
              <div key={name}>
                <dt>
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">{name}</code>
                </dt>
                <dd className="mt-1 text-foreground/90">{does}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
