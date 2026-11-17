import Link from "next/link";
import { companySizeLabels, label, remotePolicyLabels, techLabels } from "@/lib/data/labels";
import type { ExploreCompany } from "@/lib/explore";
import { HiringBadge, NewBadge, RegionChip, Tag } from "./chips";
import { CompanyLogo } from "./company-logo";
import { SaveButton } from "./save-button";

const MAX_STACK = 3;

/** One company in a list. The whole row opens the profile; Save sits on top. */
export function CompanyRow({
  company,
  hiring,
  isNew,
}: {
  company: ExploreCompany;
  hiring?: { total: number; remote: number };
  isNew: boolean;
}) {
  const stack = company.technologies.slice(0, MAX_STACK);
  const moreStack = company.technologies.length - stack.length;
  const meta = [company.domain, label(remotePolicyLabels, company.remotePolicy)].filter(Boolean).join(" · ");

  return (
    <li className="relative flex gap-3.5 px-4 py-4 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:bg-muted/60 sm:px-5">
      <CompanyLogo name={company.name} domain={company.domain} className="mt-0.5" />
      <div className="min-w-0 flex-1 pr-9">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base leading-6 font-semibold">
            <Link
              href={`/company-profiles/${company.slug}`}
              className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
            >
              {company.name}
            </Link>
          </h3>
          {isNew && <NewBadge />}
        </div>
        {meta && <p className="truncate text-sm text-muted-foreground">{meta}</p>}
        {company.blurb && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground/80">{company.blurb}</p>
        )}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {hiring && <HiringBadge total={hiring.total} remote={hiring.remote} />}
          <RegionChip region={company.region} />
          {company.companySize && <Tag>{label(companySizeLabels, company.companySize)} people</Tag>}
          {stack.map((tech) => (
            <Tag key={tech}>{label(techLabels, tech)}</Tag>
          ))}
          {moreStack > 0 && (
            <Tag>
              +{moreStack}
              <span className="sr-only"> more technologies</span>
            </Tag>
          )}
        </div>
      </div>
      <SaveButton slug={company.slug} name={company.name} className="absolute top-2.5 right-1.5 z-10 sm:right-2.5" />
    </li>
  );
}
