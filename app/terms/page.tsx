import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { MAKER } from "@/lib/maker";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using RemoteJobs: free job and company information, straight from employers.",
  alternates: { canonical: "/terms" },
};

const CONTACT = "info@ghayasuddin.net";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="27 November 2026">
      <LegalSection title="The service">
        <p>
          RemoteJobs, run by {MAKER.name}, lists remote-friendly tech companies and the remote roles they&apos;re hiring
          for. Browsing, searching and the job and company data are free, and don&apos;t need an account. By using the
          site you agree to these terms.
        </p>
      </LegalSection>

      <LegalSection title="Where the information comes from">
        <p>
          Roles are read from employers&apos; own public job boards and refreshed about every hour. Company profiles come
          from the community-run remoteintech/remote-jobs list. We work to keep both accurate, but roles close, change
          and sometimes have errors. Always check the details on the employer&apos;s own page before you apply.
        </p>
        <p>
          You apply directly with the employer. RemoteJobs isn&apos;t a recruiter, isn&apos;t part of any hiring decision,
          and isn&apos;t responsible for employers&apos; listings or how they hire.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          Browsing doesn&apos;t need an account. Saving jobs and companies, the application tracker and job alerts need
          you to sign in with Google. Keep your Google account secure; you&apos;re responsible for what happens under your
          account. You can delete it any time on the <Link href="/account">account page</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Fair use">
        <ul>
          <li>Don&apos;t use RemoteJobs to break the law or to harm, harass or spam anyone.</li>
          <li>
            Don&apos;t overload the site. For bulk access, use the open feeds, <code>/data/jobs.json</code> or the MCP
            server described on <Link href="/ai">Use with AI</Link>.
          </li>
          <li>Don&apos;t try to get into accounts or data that aren&apos;t yours.</li>
        </ul>
        <p>Accounts that break these rules may be suspended or removed.</p>
      </LegalSection>

      <LegalSection title="Paid tools">
        <p>
          Job and company information will always be free. If paid career tools are offered later, their price and terms
          will be shown before you buy.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          RemoteJobs is provided as it is, without warranties of any kind. To the extent the law allows, we aren&apos;t
          liable for losses from using the site or relying on its information.
        </p>
      </LegalSection>

      <LegalSection title="Changes and contact">
        <p>
          These terms may change; the current version is always on this page. Questions? Email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. See also the <Link href="/privacy">privacy policy</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
