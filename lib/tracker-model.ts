// The application tracker's data, shared by the browser store, the sync API
// and tests. No React or DOM here.

export const TRACK_STATUSES = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  closed: "Closed",
} as const;
export type TrackStatus = keyof typeof TRACK_STATUSES;
export const TRACK_STATUS_KEYS = Object.keys(TRACK_STATUSES) as TrackStatus[];

export const NOTE_MAX = 2000;
export const TRACKER_MAX = 1000;

export type TrackedJob = {
  /** `${company}/${id}`. */
  key: string;
  company: string;
  companyName: string;
  domain: string | null;
  id: string;
  title: string;
  location: string;
  status: TrackStatus;
  note: string;
  savedAt: string;
  /** When it moved to Applied (kept if it moves on). */
  appliedAt: string | null;
  updatedAt: string;
  /** A removal, kept so it syncs to other devices. */
  deleted?: boolean;
};

export const trackKey = (job: { company: string; id: string }) => `${job.company}/${job.id}`;

const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/;
const str = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");

/** A tracked job from untrusted input (storage, an import, the network), or null if it isn't one. */
export function cleanTrackedJob(value: unknown): TrackedJob | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const company = str(v.company, 120);
  const id = str(v.id, 200);
  const updatedAt = str(v.updatedAt, 40);
  if (!company || !id || !ISO.test(updatedAt)) return null;
  const status = TRACK_STATUS_KEYS.includes(v.status as TrackStatus) ? (v.status as TrackStatus) : "saved";
  const savedAt = ISO.test(str(v.savedAt, 40)) ? str(v.savedAt, 40) : updatedAt;
  const appliedAt = ISO.test(str(v.appliedAt, 40)) ? str(v.appliedAt, 40) : null;
  return {
    key: trackKey({ company, id }),
    company,
    companyName: str(v.companyName, 200) || company,
    domain: str(v.domain, 200) || null,
    id,
    title: str(v.title, 300) || "Untitled role",
    location: str(v.location, 300),
    status,
    note: str(v.note, NOTE_MAX),
    savedAt,
    appliedAt,
    updatedAt,
    ...(v.deleted === true && { deleted: true }),
  };
}

/** Newest change wins, per item. */
export function mergeTracked(a: TrackedJob[], b: TrackedJob[]): TrackedJob[] {
  const byKey = new Map<string, TrackedJob>();
  for (const job of [...a, ...b]) {
    const current = byKey.get(job.key);
    if (!current || job.updatedAt > current.updatedAt) byKey.set(job.key, job);
  }
  return [...byKey.values()];
}

/** The same job, moved to a new status. Applied keeps its first date. */
export function withStatus(job: TrackedJob, status: TrackStatus, now: string): TrackedJob {
  const appliedAt = job.appliedAt ?? (status === "saved" ? null : now);
  return { ...job, status, appliedAt: status === "saved" ? null : appliedAt, updatedAt: now };
}
