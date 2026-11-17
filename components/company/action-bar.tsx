"use client";

import { ArrowDownIcon, ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SaveButton } from "./save-button";
import { ShareButton } from "./share-button";

/** Phone-only bar pinned to the bottom of a company page (it replaces the tab bar). */
export function CompanyActionBar({
  slug,
  name,
  rolesCount,
  careersUrl,
}: {
  slug: string;
  name: string;
  rolesCount: number;
  careersUrl: string | null;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-background pb-safe md:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center gap-1 px-3">
        <SaveButton slug={slug} name={name} />
        <ShareButton name={name} />
        {rolesCount > 0 ? (
          <Button asChild className="ml-auto h-11 rounded-full px-5 text-[0.9375rem]">
            <a href="#open-roles">
              See {rolesCount} open {rolesCount === 1 ? "role" : "roles"}
              <ArrowDownIcon aria-hidden />
            </a>
          </Button>
        ) : (
          careersUrl && (
            <Button asChild className="ml-auto h-11 rounded-full px-5 text-[0.9375rem]">
              <a href={careersUrl} target="_blank" rel="noopener noreferrer">
                Careers page
                <ArrowUpRightIcon aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
