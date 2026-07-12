import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized || typeof window === "undefined") return;
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;
  const host =
    (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
    "https://us.i.posthog.com";
  posthog.init(key, {
    api_host: host,
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
