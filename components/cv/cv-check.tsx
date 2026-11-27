"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  FileTextIcon,
  LockIcon,
  QuoteIcon,
  UploadIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { compareWithRole, readabilityChecks, wordCount, type CheckStatus, type CvDocument } from "@/lib/cv/analyze";
import { readCvFile } from "@/lib/cv/extract";
import { cn } from "@/lib/utils";

type StoredCv = CvDocument & { name: string };
type Role = { key: string; title: string; companyName: string; provider: string; text: string };

const SESSION_KEY = "remote-jobs:cv";
const DEVICE_KEY = "remote-jobs:cv-remembered";

function loadStoredCv(): { cv: StoredCv | null; remembered: boolean } {
  try {
    const device = window.localStorage.getItem(DEVICE_KEY);
    if (device) return { cv: JSON.parse(device) as StoredCv, remembered: true };
    const session = window.sessionStorage.getItem(SESSION_KEY);
    if (session) return { cv: JSON.parse(session) as StoredCv, remembered: false };
  } catch {
    // Storage blocked: start empty.
  }
  return { cv: null, remembered: false };
}

function storeCv(cv: StoredCv | null, remember: boolean) {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(DEVICE_KEY);
    if (cv) (remember ? window.localStorage : window.sessionStorage).setItem(remember ? DEVICE_KEY : SESSION_KEY, JSON.stringify(cv));
  } catch {
    // Storage blocked: the CV just isn't kept.
  }
}

const STATUS: Record<CheckStatus, { icon: typeof CheckCircle2Icon; label: string; className: string }> = {
  good: { icon: CheckCircle2Icon, label: "Looks good", className: "text-foreground" },
  tip: { icon: AlertTriangleIcon, label: "Worth a look", className: "text-hiring-foreground" },
  problem: { icon: XCircleIcon, label: "Fix this", className: "text-destructive" },
};

function CvPicker({ onCv }: { onCv: (cv: StoredCv) => void }) {
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const read = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      onCv({ ...(await readCvFile(file)), name: file.name });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't read that file.");
    } finally {
      setReading(false);
    }
  };

  if (pasting) {
    return (
      <div className="grid gap-3">
        <label htmlFor="cv-text" className="sr-only">
          Your CV as text
        </label>
        <textarea
          id="cv-text"
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          rows={10}
          placeholder="Paste the text of your CV"
          className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-11 rounded-full px-5"
            disabled={wordCount(pasted) < 20}
            onClick={() => onCv({ text: pasted, kind: "text", pages: null, layout: null, name: "Pasted text" })}
          >
            Use this text
          </Button>
          <Button variant="ghost" className="h-11 rounded-full px-4" onClick={() => setPasting(false)}>
            Upload a file instead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void read(event.dataTransfer.files[0]);
        }}
        className={cn(
          "grid cursor-pointer place-items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted/60",
          dragging && "border-primary bg-secondary",
        )}
      >
        <UploadIcon className="size-7 text-muted-foreground" aria-hidden />
        <span className="font-semibold">{reading ? "Reading your CV…" : "Choose your CV, or drop it here"}</span>
        <span className="text-sm text-muted-foreground">PDF, Word (.docx) or text, up to 10 MB</span>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="sr-only"
          disabled={reading}
          onChange={(event) => {
            void read(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Button variant="link" className="h-auto justify-self-start p-0" onClick={() => setPasting(true)}>
        Paste the text instead
      </Button>
    </div>
  );
}

function RolePicker({ role, loading, error, onClear, pasted, onPaste }: {
  role: Role | null;
  loading: boolean;
  error: string | null;
  onClear: () => void;
  pasted: string;
  onPaste: (text: string) => void;
}) {
  if (loading) return <p className="text-muted-foreground">Loading the role…</p>;
  if (role) {
    return (
      <div className="grid gap-2">
        <p className="text-lg leading-snug font-semibold">{role.title}</p>
        <p className="text-muted-foreground">
          {role.companyName} · via {role.provider}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild variant="outline" className="h-10 rounded-full px-4">
            <Link href={`/jobs/${role.key}`}>See the role</Link>
          </Button>
          <Button variant="ghost" className="h-10 rounded-full px-4" onClick={onClear}>
            Use a different role
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      <label htmlFor="role-text" className="sr-only">
        The job description
      </label>
      <textarea
        id="role-text"
        value={pasted}
        onChange={(event) => onPaste(event.target.value)}
        rows={8}
        placeholder="Paste a job description (optional)"
        className="w-full rounded-2xl border bg-background px-4 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <p className="text-sm text-muted-foreground">
        Or open any role on{" "}
        <Link href="/jobs" className="font-medium text-primary underline underline-offset-4">
          Jobs
        </Link>{" "}
        and press &ldquo;Check my CV against this role&rdquo;.
      </p>
    </div>
  );
}

function Chips({ items, tone }: { items: { name: string }[]; tone: "have" | "missing" }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map(({ name }) => (
        <li
          key={name}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
            tone === "have" ? "bg-secondary text-secondary-foreground" : "border border-dashed",
          )}
        >
          {tone === "have" ? <CheckCircle2Icon className="size-3.5" aria-hidden /> : null}
          {name}
        </li>
      ))}
    </ul>
  );
}

/** The free CV check: everything happens on this device. */
export function CvCheck() {
  const [cv, setCv] = useState<StoredCv | null>(null);
  const [remember, setRemember] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [roleState, setRoleState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [pastedRole, setPastedRole] = useState("");

  // A CV from earlier in this visit (or remembered on this device), and the role from ?role=.
  useEffect(() => {
    const stored = loadStoredCv();
    const key = new URLSearchParams(window.location.search).get("role");
    // Restoring browser-only state after hydration: there's nothing to render on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored.cv) setCv(stored.cv);
    setRemember(stored.remembered);
    if (!key) return;
    setRoleState({ loading: true, error: null });
    fetch(`/api/role-text?role=${encodeURIComponent(key)}`)
      .then(async (response) => {
        const body = (await response.json()) as Omit<Role, "key"> & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "That role couldn't be loaded.");
        setRole({ ...body, key });
        setRoleState({ loading: false, error: null });
      })
      .catch((reason: Error) => setRoleState({ loading: false, error: `${reason.message} Paste the description instead.` }));
  }, []);

  const roleText = role?.text || pastedRole;
  const checks = useMemo(() => (cv ? readabilityChecks(cv) : []), [cv]);
  const match = useMemo(() => (cv && wordCount(roleText) >= 30 ? compareWithRole(cv.text, roleText) : null), [cv, roleText]);
  const named = match ? match.found.length + match.missing.length : 0;

  const chooseCv = (next: StoredCv | null) => {
    setCv(next);
    storeCv(next, remember);
  };

  return (
    <div className="grid gap-10">
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="your-cv" className="rounded-3xl border p-5 sm:p-6">
          <h2 id="your-cv" className="mb-4 text-lg font-bold tracking-tight">
            Your CV
          </h2>
          {cv ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                  <FileTextIcon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{cv.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {cv.pages ? `${cv.pages} ${cv.pages === 1 ? "page" : "pages"} · ` : ""}
                    {wordCount(cv.text).toLocaleString("en")} words
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="size-10 rounded-full" aria-label="Remove this CV" onClick={() => chooseCv(null)}>
                  <XIcon className="size-5" aria-hidden />
                </Button>
              </div>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => {
                    setRemember(event.target.checked);
                    storeCv(cv, event.target.checked);
                  }}
                  className="size-4 accent-primary"
                />
                Remember it on this device, to check it against other roles
              </label>
            </div>
          ) : (
            <CvPicker onCv={chooseCv} />
          )}
        </section>

        <section aria-labelledby="the-role" className="rounded-3xl border p-5 sm:p-6">
          <h2 id="the-role" className="mb-4 text-lg font-bold tracking-tight">
            The role
          </h2>
          <RolePicker
            role={role}
            loading={roleState.loading}
            error={roleState.error}
            onClear={() => {
              setRole(null);
              window.history.replaceState(null, "", window.location.pathname);
            }}
            pasted={pastedRole}
            onPaste={setPastedRole}
          />
        </section>
      </div>

      {cv && (
        <section aria-labelledby="readable" className="grid gap-4">
          <div>
            <h2 id="readable" className="text-xl font-bold tracking-tight">
              How a hiring system reads your CV
            </h2>
            <p className="mt-1 max-w-[36rem] text-muted-foreground">
              Every company sets up its system differently, so nobody can predict how one will rank you. These are the
              things that trip most of them up.
            </p>
          </div>
          <ul className="divide-y rounded-2xl border">
            {checks.map((check) => {
              const { icon: Icon, label, className } = STATUS[check.status];
              return (
                <li key={check.id} className="flex gap-3 p-4 sm:p-5">
                  <Icon className={cn("mt-0.5 size-5 shrink-0", className)} aria-label={label} />
                  <div>
                    <p className="font-semibold">{check.title}</p>
                    <p className="mt-0.5 max-w-[40rem] text-muted-foreground">{check.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {cv && match && (
        <section aria-labelledby="matches" className="grid gap-5">
          <div>
            <h2 id="matches" className="text-xl font-bold tracking-tight">
              How it lines up with {role ? `this ${role.companyName} role` : "the role"}
            </h2>
            <p className="mt-1 max-w-[36rem] text-muted-foreground">
              {named === 0
                ? "The description doesn't name specific tools or skills we recognise."
                : `The posting names ${named} ${named === 1 ? "skill" : "skills"} we recognise. Your CV mentions ${match.found.length} of them.`}{" "}
              Recruiters often search for these words, so use the posting&apos;s wording where it&apos;s true for you, and only
              add what you really know.
            </p>
          </div>
          {match.found.length > 0 && (
            <div className="grid gap-2">
              <h3 className="font-semibold">In your CV</h3>
              <Chips items={match.found} tone="have" />
            </div>
          )}
          {match.missing.length > 0 && (
            <div className="grid gap-2">
              <h3 className="font-semibold">Not in your CV</h3>
              <Chips items={match.missing} tone="missing" />
            </div>
          )}
          {(match.years.length > 0 || match.constraints.length > 0) && (
            <div className="grid gap-2">
              <h3 className="font-semibold">Check these before you apply</h3>
              <p className="max-w-[36rem] text-sm text-muted-foreground">
                Requirements like these are often hard filters: the system may screen applications out on them alone.
              </p>
              <ul className="grid gap-2">
                {[...match.years, ...match.constraints].map((line) => (
                  <li key={line} className="flex gap-2.5 rounded-2xl bg-muted px-4 py-3 text-sm">
                    <QuoteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {role && (
            <p className="text-sm text-muted-foreground">
              This role is on {role.provider}. Like most hiring systems, it reads the text of your CV into a profile that
              recruiters search and filter.
            </p>
          )}
        </section>
      )}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your CV is read on this device and never uploaded. Only the job description is loaded from RemoteJobs.
      </p>
    </div>
  );
}
