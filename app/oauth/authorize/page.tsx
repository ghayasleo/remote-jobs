import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OAuthConsent } from "@/components/auth/oauth-consent";
import { ACCOUNT_MCP_ENABLED } from "@/lib/features";

export const metadata: Metadata = { title: "Allow access", robots: { index: false } };

/** Where AI apps send people to approve using their RemoteJobs account (OAuth 2.1, for app/mcp/account). */
export default function AuthorizePage() {
  // Development only for now (see lib/features.ts).
  if (!ACCOUNT_MCP_ENABLED) notFound();
  return (
    <div className="mx-auto max-w-lg px-4 pt-10 pb-16 sm:px-6">
      <Suspense fallback={<div className="h-72" />}>
        <OAuthConsent />
      </Suspense>
    </div>
  );
}
