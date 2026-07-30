import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, ArrowRight, Lock, Mail, ShieldCheck, WifiOff, Tent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { DEMO_USERS, ROLES, ROLE_HOME, type Role } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const { session, ready, login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campCode, setCampCode] = useState("");
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (ready && session) navigate({ to: ROLE_HOME[session.role] });
  }, [ready, session, navigate]);

  const onRoleChange = (r: Role) => {
    setRole(r);
    setEmail("");
    setPassword("");
    setCampCode("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (role !== "admin" && !campCode)) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const s = await login(email, password, role !== "admin" ? campCode : undefined, role);
      toast.success(`Welcome, ${s.name.split(" ")[0]}`);
      navigate({ to: ROLE_HOME[s.role] });
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in");
    }
  };

  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative overflow-hidden text-white flex-col justify-between bg-zinc-900">
        <div className="absolute inset-0">
          <img src="https://i.ibb.co/5XH8Zhp4/frederick-shaw-X2hd-LTr-U7-Pg-unsplash.jpg" alt="CampCare Hero" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </div>
        <div className="relative flex items-center gap-3 p-12">
          <div className="size-11 rounded-2xl bg-white/20 backdrop-blur grid place-items-center shadow-sm border border-white/10">
            <Activity className="size-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="drop-shadow-md">
            <div className="font-bold text-xl leading-tight">CampCare</div>
            <div className="text-xs text-white/90 uppercase tracking-widest font-medium">Medical NGO Platform</div>
          </div>
        </div>

        <div className="relative space-y-6 p-12">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight drop-shadow-lg">
            Care that reaches<br />every village.
          </h1>
          <p className="text-white/90 max-w-md drop-shadow-md font-medium text-base">
            End-to-end camp management — registration, vitals, consultations, pharmacy and analytics — designed to work even without internet.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-white/80 font-medium p-12">
          <ShieldCheck className="size-4" /> HIPAA-aligned · AES-256 encrypted · WCAG AA
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="size-11 rounded-2xl gradient-brand grid place-items-center text-white">
              <Activity className="size-6" />
            </div>
            <div>
              <div className="font-bold text-lg">CampCare</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Medical NGO</div>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in to your camp</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose your role to continue.</p>

          <div className="grid grid-cols-4 gap-1.5 mt-6 p-1 bg-muted/60 rounded-2xl">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => onRoleChange(r.value)}
                className={cn(
                  "text-[10px] md:text-xs font-medium py-2 px-1 rounded-xl transition-all",
                  role === r.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label.split(" ")[0]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2 min-h-4">
            {ROLES.find((r) => r.value === role)?.description}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Official Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" placeholder="name@campcare.org" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={() => toast.info("Reset link sent (demo)")} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" placeholder="••••••••" />
              </div>
            </div>

            {role !== "admin" && (
              <div className="space-y-1.5">
                <Label htmlFor="campCode">Camp ID</Label>
                <div className="relative">
                  <Tent className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    id="campCode" 
                    value={campCode} 
                    onChange={(e) => setCampCode(e.target.value.toUpperCase())} 
                    className="pl-9 h-11" 
                    placeholder="e.g. CMP-2026-0001" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">Remember me on this device</Label>
            </div>
            <Button type="submit" className="w-full h-11 gap-2 rounded-xl gradient-brand hover:opacity-95 border-0">
              Sign in <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button type="button" onClick={() => navigate({ to: "/register" })} className="text-primary font-medium hover:underline">
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
