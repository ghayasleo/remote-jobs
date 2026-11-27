import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { MAKER } from "@/lib/maker";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What RemoteJobs stores, why, and how to delete it. Browsing never needs an account.",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "info@ghayasuddin.net";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="27 November 2026">
      <LegalSection title="The short version">
        <p>
          RemoteJobs is free to browse without an account. Saving jobs and companies, the application tracker and job
          alerts need you to sign in with Google, and we keep only what those features need. We don&apos;t sell your data or show ads. Your CV never leaves
          your device when you use the CV check.
        </p>
      </LegalSection>

      <LegalSection title="Who runs RemoteJobs">
        <p>
          RemoteJobs is built and run by {MAKER.name}. For anything about your data, email{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection title="When you browse without signing in">
        <ul>
          <li>
            Your filter choices are kept in your browser, on your device. If you tick &ldquo;Remember it on this
            device&rdquo; in the CV check, your CV&apos;s text is kept there too. We can&apos;t see either.
          </li>
          <li>
            Vercel Web Analytics and Speed Insights count page views and measure loading speed without cookies and without
            identifying you.
          </li>
          <li>
            Google Analytics runs only if you accept analytics cookies in the cookie banner. You can change that any time
            with &ldquo;Cookie choices&rdquo;.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="When you sign in with Google">
        <p>Google tells us your name, email address, profile photo and a Google account ID. We store them, with what you save, to:</p>
        <ul>
          <li>keep your saved jobs and companies, your application tracker and your alerts on your dashboard, on every device;</li>
          <li>send you the job alerts you set up;</li>
          <li>keep any CV tools you use available when you come back.</li>
        </ul>
        <p>
          We don&apos;t get your Google password, contacts or anything else in your Google account, and we never post
          anything on your behalf.
        </p>
      </LegalSection>

      <LegalSection title="Job alerts">
        <p>
          If you turn on alerts, your browser gives us a notification address for your device, and we store it with the
          searches you want alerts for. Turn alerts off, or delete your account, and they&apos;re removed.
        </p>
      </LegalSection>

      <LegalSection title="The CV check">
        <p>
          The CV check runs entirely in your browser. Your CV file is read on your device to compare it with a job
          description; it isn&apos;t uploaded to us or anyone else.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <ul>
          <li>
            <code>rj_session</code>: keeps you signed in. Your browser can&apos;t read it; it lasts up to six months.
          </li>
          <li>
            <code>rj_user</code>: your name and photo, so the page can show who&apos;s signed in.
          </li>
          <li>Your cookie choice, and Google Analytics cookies only if you accept them.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Who else handles data">
        <p>
          We use a few services to run the site: Vercel (hosting), Neon (the database, in the United States) and Google
          (sign-in, and analytics if you accept it). They process data only to provide those services.
        </p>
      </LegalSection>

      <LegalSection title="Job and company information">
        <p>
          Job listings come from employers&apos; own public job boards, and company profiles from the community-run{" "}
          <a href="https://github.com/remoteintech/remote-jobs">remoteintech/remote-jobs</a> list. They describe
          companies and roles, not you.
        </p>
      </LegalSection>

      <LegalSection title="Keeping and deleting your data">
        <p>
          Your account and what&apos;s stored with it stay until you delete them. Delete your account on the{" "}
          <Link href="/account">account page</Link> and it&apos;s removed right away, along with everything stored for it.
          Anything saved only in your browser stays there until you clear it.
        </p>
        <p>
          You can also ask for a copy of your data, or for it to be corrected or deleted, by emailing{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>RemoteJobs is for people looking for work, and isn&apos;t meant for anyone under 16.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>If this policy changes, the new version will be posted here with a new date.</p>
      </LegalSection>
    </LegalPage>
  );
}
