import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowRight, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { ROLES, type Role } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("admin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campCode, setCampCode] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      setLoading(true);
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name, roleName: role, ...(role !== "admin" && { campCode }) }),
      });
      toast.success("Account created successfully. You can now sign in.");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3 justify-center">
          <div className="size-11 rounded-2xl gradient-brand grid place-items-center text-white">
            <Activity className="size-6" />
          </div>
          <div>
            <div className="font-bold text-lg">CampCare</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Medical NGO</div>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-center">Create an account</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center">Join CampCare to manage medical camps.</p>

        <div className="grid grid-cols-4 gap-1.5 mt-6 p-1 bg-muted/60 rounded-2xl">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={cn(
                "text-[10px] md:text-[11px] font-medium py-2 px-1 rounded-xl transition-all",
                role === r.value ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.value === "admin" ? "NGO Admin" : r.label.split(" ")[0]}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" />
            </div>
          </div>
          
          {role !== "admin" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="campCode">Camp Code</Label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="campCode" type="text" value={campCode} onChange={(e) => setCampCode(e.target.value.toUpperCase().trim())} className="pl-9 h-11 uppercase" />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Ask your NGO Admin for the Camp Code to join</p>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-11 gap-2 rounded-xl gradient-brand hover:opacity-95 border-0 mt-4">
            {loading ? "Registering..." : "Register"} <ArrowRight className="size-4" />
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate({ to: "/" })} className="text-primary font-medium hover:underline">
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
