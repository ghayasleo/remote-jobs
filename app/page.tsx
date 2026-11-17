import Link from "next/link";
import { getCompanies } from "./lib/companies";

// Temporary page while the new UI is built.
export const revalidate = 86400;

export default async function Home() {
  const companies = await getCompanies();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Remote Jobs</h1>
      <p className="mt-1 text-sm">{companies.length} companies</p>
      <ul className="mt-6 space-y-1">
        {companies.map((company) => (
          <li key={company.slug}>
            <Link href={`/company-profiles/${company.slug}`} className="underline">
              {company.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
