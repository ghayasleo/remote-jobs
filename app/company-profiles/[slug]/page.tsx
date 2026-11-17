import { Suspense } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findSlugByAlias, getCompany, getCompanyIndex } from "@/lib/data/companies";

export async function generateStaticParams() {
  const companies = await getCompanyIndex();
  return companies.map((company) => ({ slug: company.slug }));
}

// Temporary page while the new UI is built.
export default function CompanyPage({ params }: PageProps<"/company-profiles/[slug]">) {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl p-6">Loading…</main>}>
      <CompanyProfile params={params} />
    </Suspense>
  );
}

async function CompanyProfile({ params }: Pick<PageProps<"/company-profiles/[slug]">, "params">) {
  const { slug } = await params;
  const company = await getCompany(slug);
  if (!company) {
    const renamedTo = await findSlugByAlias(slug);
    if (renamedTo) permanentRedirect(`/company-profiles/${renamedTo}`);
    notFound();
  }

  return (
    <main className="prose mx-auto max-w-3xl p-6">
      <h1>{company.name}</h1>
      {company.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <Markdown remarkPlugins={[remarkGfm]}>{section.markdown}</Markdown>
        </section>
      ))}
    </main>
  );
}
