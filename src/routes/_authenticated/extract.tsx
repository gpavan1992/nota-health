import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/extract")({
  head: () => ({ meta: [{ title: "Clinical Extract — Nota Health" }] }),
  component: () => <Outlet />,
});
