"use client";

import type { ExploreData } from "@/lib/data/explore-data";
import { createJsonStore } from "./json-store";

// The full company list, shared by Explore and Saved.
const store = createJsonStore<ExploreData>("/data/explore.json");

export const useExploreData = store.useData;
export const useExploreDataFailed = store.useFailed;
export const retryExploreData = store.retry;
