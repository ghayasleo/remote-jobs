import type { Metadata } from "next";
import { AccountView } from "@/components/auth/account-view";
import { ScreenHeading } from "@/components/dashboard/screen-heading";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <>
      <ScreenHeading title="Account" />
      <AccountView />
    </>
  );
}
