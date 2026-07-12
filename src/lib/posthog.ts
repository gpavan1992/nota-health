import posthog from "posthog-js";

const POSTHOG_KEY =
  (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ??
  "phc_kFEJSG5caeMn3o6MtGokokdxSLNv7BJJekdpPUL2d7G7";
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  if (!POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,

    person_profiles: "identified_only",
    capture_pageview: false, // we capture manually on route change
    capture_pageleave: true,
    autocapture: true,
  });
  initialized = true;
}

export function capturePageview(url: string) {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: url });
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.identify(id, props);
}

export function resetPostHog() {
  if (!initialized) return;
  posthog.reset();
}

export { posthog };
