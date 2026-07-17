import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const { session, ready } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !session) navigate({ to: "/" });
  }, [ready, session, navigate]);

  if (!ready || !session) {
    return (
      <div className="min-h-dvh grid place-items-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
