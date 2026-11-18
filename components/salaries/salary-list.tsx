import Link from "next/link";
import { salaryRolePath, usdRange, type SalaryRole } from "@/lib/salaries";

/** Roles with their published annual range, each row opening the role's page. */
export function SalaryList({ roles }: { roles: SalaryRole[] }) {
  return (
    <ul className="divide-y border-y sm:mx-6 sm:rounded-2xl sm:border">
      {roles.map((role) => (
        <li
          key={`${role.company}-${role.id}`}
          className="relative flex items-start justify-between gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5"
        >
          <div className="min-w-0">
            <h3 className="leading-6 font-semibold">
              <Link
                href={salaryRolePath(role)}
                className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
              >
                {role.title}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {[role.companyName, role.location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <p className="shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{usdRange(role)}</p>
        </li>
      ))}
    </ul>
  );
}

/** The figures under a salary page's heading. */
export function SalaryStatTiles({ count, low, high }: { count: number; low: string; high: string }) {
  return (
    <dl className="mt-5 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-2xl border bg-border text-center">
      {[
        ["Ranges", new Intl.NumberFormat("en").format(count)],
        ["Median low", low],
        ["Median high", high],
      ].map(([term, value]) => (
        <div key={term} className="bg-card px-3 py-3">
          <dd className="text-xl font-bold tabular-nums">{value}</dd>
          <dt className="text-xs text-muted-foreground">{term}</dt>
        </div>
      ))}
    </dl>
  );
}
