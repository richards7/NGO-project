import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  ChevronRight,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Pill,
  Search,
  Stethoscope,
  Sun,
  Tent,
  UserPlus,
  Users,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { type ReactNode } from "react";
import { useAuth, useOnlineStatus, useTheme } from "@/lib/auth";
import { useSyncStatus } from "@/lib/powersync/provider";
import type { Role } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { to: "/camps", label: "Camps", icon: Tent, roles: ["admin"] },
  { to: "/patients", label: "Patients", icon: Users, roles: ["admin", "registration"] },
  { to: "/patients/new", label: "New Patient", icon: UserPlus, roles: ["registration"] },
  { to: "/vitals", label: "Vitals", icon: HeartPulse, roles: ["registration"] },
  { to: "/queue", label: "Smart Queue", icon: ClipboardList, roles: ["registration", "doctor"] },
  { to: "/consultation", label: "Consultation", icon: Stethoscope, roles: ["doctor"] },
  { to: "/pharmacy", label: "Pharmacy", icon: Pill, roles: ["pharmacy"] },
  { to: "/inventory", label: "Inventory", icon: Boxes, roles: ["admin", "pharmacy"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin"] },
  { to: "/feedback", label: "Feedback", icon: MessageSquare, roles: ["admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const { online } = useOnlineStatus();
  const { pendingMutations: pending, connected, triggerSync: sync } = useSyncStatus();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!session) return null;
  const items = NAV.filter((n) => n.roles.includes(session.role));
  const current = items.find((i) => pathname === i.to || (i.to !== "/dashboard" && pathname.startsWith(i.to)));

  return (
    <div className="min-h-dvh flex w-full bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center gap-2 px-6 border-b">
          <div className="size-9 grid place-items-center rounded-xl gradient-brand text-white">
            <Activity className="size-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-base">Arogya</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Camp OS</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {items.map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className={cn("size-4.5 shrink-0", active && "text-primary")} />
                <span className="truncate">{item.label}</span>
                {active && <ChevronRight className="ml-auto size-4" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
            connected ? "bg-success/10 text-success" : online ? "bg-primary/10 text-primary" : "bg-warning/10 text-warning-foreground",
          )}>
            <span className={cn("size-2 rounded-full", connected ? "bg-success animate-pulse" : online ? "bg-primary" : "bg-warning")} />
            {connected ? "Synced" : online ? `Online · ${pending} pending` : `Offline · ${pending} pending`}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b bg-card/70 backdrop-blur sticky top-0 z-20">
          <div className="h-full px-4 md:px-6 flex items-center gap-3">
            <div className="lg:hidden size-9 grid place-items-center rounded-xl gradient-brand text-white">
              <Activity className="size-5" />
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <span>Arogya</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground font-medium truncate">{current?.label ?? "Home"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search patients, meds, camps…" className="pl-9 w-64 h-9 bg-muted/50 border-transparent focus-visible:bg-card" />
              </div>
              {!online && (
                <Badge variant="outline" className="gap-1.5 border-warning/40 bg-warning/10 text-warning-foreground">
                  <WifiOff className="size-3" /> Offline
                </Badge>
              )}
              {pending > 0 && (
                <Button variant="outline" size="sm" onClick={sync} className="gap-1.5 h-9">
                  <RefreshCw className="size-3.5" /> Sync {pending}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-9 w-9">
                {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Notifications" className="h-9 w-9 relative">
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 gap-2 px-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                        {session.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-xs font-semibold">{session.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{session.role.replace("_", " ")}</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{session.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      navigate({ to: "/" });
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {!online && (
          <div className="bg-warning/10 border-b border-warning/30 px-4 md:px-6 py-2 text-xs text-warning-foreground flex items-center gap-2">
            <WifiOff className="size-3.5" /> You're offline. Changes will sync automatically when you're back online.
          </div>
        )}

        {/* Mobile bottom nav */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-16 lg:pb-0">{children}</main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t px-2 py-1.5 grid grid-cols-5 gap-1">
          {items.slice(0, 5).map((item) => {
            const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4.5" />
                <span className="truncate max-w-full">{item.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
