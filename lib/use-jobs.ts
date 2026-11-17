"use client";

import type { JobListing } from "@/lib/jobs";
import { DEFAULT_JOB_PARAMS, parseJobParams, serializeJobParams } from "@/lib/jobs";
import { createJsonStore } from "./json-store";
import { createUrlState } from "./url-state";

const store = createJsonStore<JobListing[]>("/data/jobs.json");

export const useJobs = store.useData;
export const useJobsFailed = store.useFailed;
export const retryJobs = store.retry;

/** The Jobs feed's search and filters, kept in the URL. */
export const useJobParams = createUrlState(parseJobParams, serializeJobParams, DEFAULT_JOB_PARAMS);
