import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/protocols")({
  head: () => ({ meta: [{ title: "Clinical Protocols — Nota Health" }] }),
  component: () => <Outlet />,
});
