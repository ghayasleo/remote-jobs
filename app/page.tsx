import CompaniesTable from "./components/companies-table";
import { getCompanies } from "./lib/companies";

// Rebuild the page with fresh data from GitHub at most once a day.
export const revalidate = 86400;

export default async function Home() {
  const companies = await getCompanies();
  return <CompaniesTable companies={companies} />;
}
