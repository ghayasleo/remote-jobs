"use client";

import { createUrlState } from "./url-state";
import { DEFAULT_PARAMS, parseParams, serializeParams } from "./explore";

/** Explore's filters, kept in the URL. */
export const useExploreParams = createUrlState(parseParams, serializeParams, DEFAULT_PARAMS);
