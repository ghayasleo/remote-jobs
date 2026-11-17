import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";
import { CompanyActionBar } from "@/components/company/action-bar";
import { Tag } from "@/components/company/chips";
import { CompanyLogo } from "@/components/company/company-logo";
import { CompanySkeleton } from "@/components/company/company-skeleton";
import { OpenRoles } from "@/components/company/open-roles";
import { CompanyFacts, ProfileSectionView } from "@/components/company/profile";
import { SaveButton } from "@/components/company/save-button";
import { ShareButton } from "@/components/company/share-button";
import { formatDate } from "@/lib/format";
import { BackButton } from "@/components/shell/navigation";
import { Button } from "@/components/ui/button";
import { findSlugByAlias, getCompany, getCompanyIndex, upstreamFileUrl } from "@/lib/data/companies";
import { getLandingTopics } from "@/lib/data/explore-data";
import { getBoard, getOpenRoles } from "@/lib/data/job-boards";
import { label, techLabels } from "@/lib/data/labels";
import { companyJsonLd, companySeo } from "@/lib/seo";
import { jsonLd } from "@/lib/site";

type Props = PageProps<"/company-profiles/[slug]">;

export async function generateStaticParams() {
  const companies = await getCompanyIndex();
  return companies.map((company) => ({ slug: company.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) return { title: "Company not found", robots: { index: false } };
  const board = getBoard(slug);
  const roles = board ? await getOpenRoles(board) : null;
  const { title, description } = companySeo(company, roles);
  const url = `/company-profiles/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

// The skeleton is part of the shared App Shell, so tapping a company shows it
// instantly while the profile streams in.
export default function CompanyPage({ params }: Props) {
  return (
    <Suspense fallback={<CompanySkeleton />}>
      <CompanyProfile params={params} />
    </Suspense>
  );
}

async function CompanyProfile({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) {
    const renamedTo = await findSlugByAlias(slug);
    if (renamedTo) permanentRedirect(`/company-profiles/${renamedTo}`);
    notFound();
  }

  const board = getBoard(slug);
  const [roles, landing] = await Promise.all([
    board ? getOpenRoles(board) : null,
    getLandingTopics().then((pages) => new Set(pages.map((page) => page.path))),
  ]);
  const regionPage = `/remote/${company.region}`;
  const careersUrl = company.careersUrl ?? company.website;
  // "About" goes first, then open roles, then the rest of the profile.
  const about = company.sections.find((section) => section.id === "blurb");
  const sections = company.sections.filter((section) => section !== about);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(companyJsonLd(company))} />
      <BackButton />

      <header className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <CompanyLogo name={company.name} domain={company.domain} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{company.name}</h1>
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {company.domain ?? company.website}
              <ArrowUpRightIcon className="size-3.5" aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <SaveButton slug={company.slug} name={company.name} withLabel />
          <ShareButton name={company.name} withLabel />
          <Button asChild size="lg" className="h-11 rounded-full px-5">
            <a href={careersUrl} target="_blank" rel="noopener noreferrer">
              Careers
              <ArrowUpRightIcon aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        </div>
      </header>

      <div className="mt-6">
        <CompanyFacts
          region={company.region}
          remotePolicy={company.remotePolicy}
          companySize={company.companySize}
          addedAt={company.addedAt}
          regionHref={landing.has(regionPage) ? regionPage : undefined}
        />
      </div>

      {company.technologies.length > 0 && (
        <ul aria-label="Tech stack" className="mt-4 flex flex-wrap gap-1.5">
          {company.technologies.map((tech) => (
            <li key={tech}>
              {landing.has(`/remote/${tech}`) ? (
                <Link href={`/remote/${tech}`} aria-label={`Remote ${label(techLabels, tech)} companies`}>
                  <Tag className="h-7 px-3 text-sm transition-colors hover:bg-muted hover:text-foreground">
                    {label(techLabels, tech)}
                  </Tag>
                </Link>
              ) : (
                <Tag className="h-7 px-3 text-sm">{label(techLabels, tech)}</Tag>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 space-y-9">
        {about && <ProfileSectionView section={about} />}

        <section id="open-roles" aria-labelledby="open-roles-title" className="scroll-mt-24">
          <h2 id="open-roles-title" className="mb-3 text-lg font-bold tracking-tight">
            Open roles
          </h2>
          <OpenRoles roles={roles} hasBoard={board !== null} careersUrl={careersUrl} name={company.name} />
        </section>

        {sections.map((section) => (
          <ProfileSectionView key={section.title} section={section} />
        ))}
      </div>

      <footer className="mt-12 border-t pt-5 text-sm text-muted-foreground">
        <p className="max-w-[36rem]">
          Profile from the community-run{" "}
          <a
            href="https://github.com/remoteintech/remote-jobs"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground underline underline-offset-4"
          >
            remoteintech/remote-jobs
          </a>{" "}
          list{company.updatedAt && <>, last updated {formatDate(company.updatedAt)}</>}. Spotted something out
          of date?{" "}
          <a
            href={upstreamFileUrl(company.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4"
          >
            Suggest an edit
          </a>
          .
        </p>
      </footer>

      <CompanyActionBar slug={company.slug} name={company.name} rolesCount={roles?.total ?? 0} careersUrl={careersUrl} />
    </article>
  );
}
