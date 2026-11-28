"use client";

import { useSearchParams } from "next/navigation";
import { CvWorkspace } from "./cv-workspace";

/** The main CV at /dashboard/cv, a tailored one at /dashboard/cv?id=… */
export function CvScreen() {
  const id = useSearchParams().get("id") ?? undefined;
  return <CvWorkspace key={id ?? "main"} recordId={id} />;
}
