import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({ meta: [{ title: "Clinical Assistant — Nota Health" }] }),
  component: () => <Outlet />,
});
