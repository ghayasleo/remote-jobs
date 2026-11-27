import type { Metadata } from "next";
import { AccountView } from "@/components/auth/account-view";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your account</h1>
      <div className="mt-6">
        <AccountView />
      </div>
    </div>
  );
}
