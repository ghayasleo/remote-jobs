import type { Metadata } from "next";
import { CheckIcon, CopyIcon, PlugIcon, TerminalIcon } from "lucide-react";
import { BrandMark } from "@/components/brand/logo";
import { CodeSnippet } from "@/components/code-snippet";
import { CompanyLogo } from "@/components/company/company-logo";
import { CopyAddressButton } from "@/components/copy-feed-button";
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from "@/components/ui/pill-tabs";
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

/** One tab per app. An app with a website shows its icon; the rest get a glyph. */
const APPS = [
  { id: "claude", name: "Claude", domain: "claude.ai" },
  { id: "chatgpt", name: "ChatGPT", domain: "chatgpt.com" },
  { id: "claude-code", name: "Claude Code", glyph: TerminalIcon },
  { id: "vscode", name: "VS Code", domain: "code.visualstudio.com" },
  { id: "cursor", name: "Cursor", domain: "cursor.com" },
] as const;

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
const VSCODE_CONFIG = JSON.stringify({ servers: { remotejobs: { type: "http", url: MCP_URL } } }, null, 2);

/** A menu item or button, as the app names it. */
function Ui({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-foreground">{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]">{children}</code>;
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
      <div className="mt-4 space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function AppIcon({ app }: { app: (typeof APPS)[number] }) {
  if ("domain" in app) return <CompanyLogo name={app.name} domain={app.domain} size="xs" />;
  const Glyph = app.glyph;
  return (
    <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-md bg-muted text-foreground">
      <Glyph className="size-3.5" />
    </span>
  );
}

/** Numbered steps, joined by a thin line so they read as one sequence. */
function Steps({ children }: { children: React.ReactNode[] }) {
  return (
    <ol>
      {children.map((step, index) => (
        <li key={index} className="relative flex gap-3.5 pb-5 last:pb-0">
          {index < children.length - 1 && <span aria-hidden className="absolute top-8.5 bottom-1.5 left-[13.5px] w-px bg-border" />}
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground tabular-nums"
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 space-y-3 pt-0.5">{step}</div>
        </li>
      ))}
    </ol>
  );
}

/** One app's setup, with a link to its own guide because app menus change. */
function Panel({ value, guide, children }: { value: string; guide?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <PillTabsContent value={value} className="rounded-2xl border p-5 sm:p-6">
      <div className="space-y-4 leading-relaxed text-foreground/90">{children}</div>
      {guide && (
        <p className="mt-5 border-t pt-4 text-sm text-muted-foreground">
          Menus change from time to time. <External href={guide.href}>{guide.label}</External> has the latest steps.
        </p>
      )}
    </PillTabsContent>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default function AiPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      {/* Remote Jobs, plugged into the apps below. */}
      <div aria-hidden className="flex items-center gap-2.5">
        <BrandMark className="size-12" />
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-4 border-t-2 border-dotted border-current opacity-50" />
          <PlugIcon className="size-4" />
          <span className="w-4 border-t-2 border-dotted border-current opacity-50" />
        </span>
        <span className="flex -space-x-2">
          {APPS.filter((app) => "domain" in app).map((app) => (
            <CompanyLogo key={app.id} name={app.name} domain={"domain" in app ? app.domain : null} className="size-10 ring-2 ring-background" />
          ))}
        </span>
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-balance sm:text-3xl">Search remote jobs from your AI assistant</h1>
      <p className="mt-3 max-w-[34rem] text-lg leading-relaxed text-foreground/90">
        Add Remote Jobs to Claude, ChatGPT, VS Code or Cursor and ask for roles in plain words. It searches the same
        companies and remote roles you see here, and links back to them.
      </p>

      <div className="mt-7 rounded-2xl bg-secondary p-4 sm:p-5">
        <p className="text-sm font-semibold text-secondary-foreground">The address to add</p>
        <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 rounded-xl border bg-background px-3.5 py-2.5 font-mono text-[0.9375rem] font-semibold break-all">
            {MCP_URL}
          </code>
          <CopyAddressButton
            path="/mcp"
            icon={<CopyIcon aria-hidden />}
            what="MCP address"
            hint="Paste it into your AI assistant as a custom connector or remote MCP server."
            variant="default"
            className="h-11 shrink-0 px-5"
          >
            Copy address
          </CopyAddressButton>
        </div>
        <ul className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-medium text-secondary-foreground">
          {["Free", "No account or key", "Read-only"].map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <CheckIcon className="size-4" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 space-y-10">
        <Section title="Add it to your assistant">
          <PillTabs defaultValue="claude">
            <PillTabsList aria-label="Your assistant" className="-mx-4 px-4 sm:mx-0 sm:px-0">
              {APPS.map((app) => (
                <PillTabsTrigger key={app.id} value={app.id}>
                  <AppIcon app={app} />
                  {app.name}
                </PillTabsTrigger>
              ))}
            </PillTabsList>

            <Panel value="claude" guide={{ href: "https://support.claude.com/en/articles/11175166", label: "Claude’s guide" }}>
              <Steps>
                {[
                  <p key="open">
                    Open <Ui>Customize → Connectors</Ui>, choose <Ui>Add</Ui>, then <Ui>Add custom connector</Ui>.
                  </p>,
                  <p key="paste">
                    Name it Remote Jobs, paste the address, and choose <Ui>Continue</Ui>.
                  </p>,
                  <p key="auth">
                    For sign-in, choose <Ui>No sign-in</Ui>, then <Ui>Add</Ui>.
                  </p>,
                  <p key="use">
                    In a chat, turn it on under <Ui>+ → Connectors</Ui>.
                  </p>,
                ]}
              </Steps>
              <Note>
                The free plan allows one custom connector. On Team and Enterprise plans, an owner adds it under Organization
                settings → Connectors.
              </Note>
            </Panel>

            <Panel value="chatgpt" guide={{ href: "https://help.openai.com/en/articles/12584461", label: "OpenAI’s guide" }}>
              <Steps>
                {[
                  <p key="open">
                    Open <Ui>Plugins</Ui>, choose <Ui>+</Ui>, then <Ui>Add custom MCP server</Ui>.
                  </p>,
                  <p key="paste">
                    Name it Remote Jobs and paste the address as the <Ui>Server URL</Ui>.
                  </p>,
                  <p key="auth">
                    Choose <Ui>No authentication</Ui>, confirm, then create and install it.
                  </p>,
                  <p key="use">
                    In a chat, type <Ui>@</Ui> and pick Remote Jobs.
                  </p>,
                ]}
              </Steps>
              <Note>Custom MCP servers work in ChatGPT on the web, on plans that allow them.</Note>
            </Panel>

            <Panel value="claude-code">
              <Steps>
                {[
                  <div key="add" className="space-y-3">
                    <p>Run this in your terminal:</p>
                    <CodeSnippet what="command" code={`claude mcp add --transport http remotejobs ${MCP_URL}`} />
                  </div>,
                  <p key="check">
                    Start Claude Code and run <Code>/mcp</Code> to check it’s connected.
                  </p>,
                ]}
              </Steps>
              <Note>
                That adds it to the project you’re in. To use it in every project, put <Code>--scope user</Code> after{" "}
                <Code>add</Code>.
              </Note>
            </Panel>

            <Panel
              value="vscode"
              guide={{ href: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers", label: "VS Code’s guide" }}
            >
              <Steps>
                {[
                  <p key="open">
                    Open the Command Palette and run <Ui>MCP: Add Server</Ui>.
                  </p>,
                  <p key="paste">
                    Choose <Ui>HTTP</Ui> and paste the address.
                  </p>,
                  <p key="name">Name it remotejobs and choose where to save it.</p>,
                ]}
              </Steps>
              <p>
                Or add it to <Code>.vscode/mcp.json</Code> in a project yourself:
              </p>
              <CodeSnippet what="configuration" code={VSCODE_CONFIG} />
            </Panel>

            <Panel value="cursor" guide={{ href: "https://cursor.com/docs/context/mcp", label: "Cursor’s guide" }}>
              <p>
                Add this to <Code>~/.cursor/mcp.json</Code> to use it everywhere, or to <Code>.cursor/mcp.json</Code> in a
                project:
              </p>
              <CodeSnippet what="configuration" code={CURSOR_CONFIG} />
            </Panel>

          </PillTabs>
          <p>
            <Ui>Using another app?</Ui> Any app that connects to remote MCP servers over Streamable HTTP works the same
            way: give it the address. It needs no key or sign-in.
          </p>
        </Section>

        <Section title="What you can ask">
          <ul className="flex flex-col items-end gap-2 rounded-2xl border p-3 sm:p-4">
            {PROMPTS.map((prompt) => (
              <li
                key={prompt}
                className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-secondary-foreground sm:max-w-[30rem]"
              >
                {prompt}
              </li>
            ))}
          </ul>
          <p>Answers come with links to each company and role here, so you can read the full page and apply.</p>
        </Section>

        <Section title="Good to know">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
            <li>It’s read-only. Your assistant can look things up, but it can’t apply, save or change anything.</li>
            <li>
              It answers from the same data as this site: companies from the community-run remoteintech/remote-jobs list,
              and open roles from their job boards, refreshed every hour.
            </li>
          </ul>
        </Section>

        <Section title="What it can do">
          <p>For the curious, these are the tools your assistant gets:</p>
          <dl className="divide-y rounded-2xl border">
            {TOOLS.map(([name, does]) => (
              <div key={name} className="px-4 py-3.5 sm:px-5">
                <dt>
                  <code className="font-mono text-sm font-semibold">{name}</code>
                </dt>
                <dd className="mt-1 text-[0.9375rem] text-foreground/90">{does}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
    </div>
  );
}
