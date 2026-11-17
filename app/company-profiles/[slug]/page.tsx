import React from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { marked } from "marked";

import { findSlugByAlias, getCompanyProfile } from "../../lib/companies";
import { companySizeLabels, label, regionLabels, remotePolicyLabels } from "../../lib/labels";


type Props = {
  params: Promise<{ slug: string }>;
};

async function Page({ params }: Props) {
  const { slug } = await params;

  // Links from the previous version of this site ended in ".md".
  if (slug.endsWith(".md")) permanentRedirect(`/company-profiles/${slug.slice(0, -3)}`);

  const profile = await getCompanyProfile(slug);
  if (!profile) {
    const renamedTo = await findSlugByAlias(slug);
    if (renamedTo) permanentRedirect(`/company-profiles/${renamedTo}`);
    notFound();
  }

  const { company, body } = profile;
  const html = await marked.parse(body);
  const tags = [
    label(regionLabels, company.region),
    label(remotePolicyLabels, company.remotePolicy),
    label(companySizeLabels, company.companySize),
  ].filter(Boolean);

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-6">
        <header className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-semibold">{company.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-theme hover:underline">
              Website
            </a>
            {company.careersUrl && (
              <a href={company.careersUrl} target="_blank" rel="noopener noreferrer" className="text-theme hover:underline">
                Careers
              </a>
            )}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2 list-none">
            {tags.map((tag) => (
              <li key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
                {tag}
              </li>
            ))}
          </ul>
        </header>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

export default Page;
