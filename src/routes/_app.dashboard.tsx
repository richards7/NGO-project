import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, ArrowUpRight, CalendarDays, Package, Pill, Stethoscope, Tent, TrendingUp, Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const COLORS = ["oklch(0.58 0.18 245)", "oklch(0.7 0.15 165)", "oklch(0.72 0.14 210)", "oklch(0.78 0.16 75)", "oklch(0.65 0.2 305)", "oklch(0.5 0.03 250)"];

function StatCard({
  icon: Icon, label, value, delta, tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  tone?: "primary" | "success" | "warning" | "accent";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <Card className="p-5 border-border/60 card-elevated">
      <div className="flex items-start justify-between">
        <div className={`size-10 rounded-xl grid place-items-center ${toneMap[tone]}`}>
          <Icon className="size-5" />
        </div>
        {delta && (
          <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-0">
            <TrendingUp className="size-3" /> {delta}
          </Badge>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { session } = useAuth();
  const first = session?.name.split(" ")[0] ?? "there";

  const [dashboard, setDashboard] = useState<any>(null);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [ageDist, setAgeDist] = useState<any[]>([]);
  const [genderDist, setGenderDist] = useState<any[]>([]);
  const [topMeds, setTopMeds] = useState<any[]>([]);
  const [camps, setCamps] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/analytics/dashboard").then(r => setDashboard(r.data)).catch(() => {});
    apiRequest("/analytics/diseases").then(r => setDiseases(r.data || [])).catch(() => {});
    apiRequest("/analytics/age").then(r => setAgeDist(r.data || [])).catch(() => {});
    apiRequest("/analytics/gender").then(r => setGenderDist(r.data || [])).catch(() => {});
    apiRequest("/analytics/medicines/top").then(r => setTopMeds(r.data || [])).catch(() => {});
    apiRequest("/camps").then(r => setCamps(r.data || [])).catch(() => {});
  }, []);

  const d = dashboard || {};

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title={`Good morning, ${first}`}
        subtitle="Here's what's happening across your camps today."
        actions={
          <>
            <Button variant="outline" className="gap-2 rounded-xl"><CalendarDays className="size-4" /> Today</Button>
            <Button className="gap-2 rounded-xl"><Tent className="size-4" /> New Camp</Button>
          </>
        }
      />

      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {[
          { icon: Tent, label: "Total Camps", value: String(d.totalCamps ?? 0), tone: "primary" as const },
          { icon: Users, label: "Registered Patients", value: String(d.totalPatients ?? 0), tone: "accent" as const },
          { icon: Stethoscope, label: "Consultations", value: String(d.totalConsultations ?? 0), tone: "primary" as const },
          { icon: Pill, label: "Medicines Dispensed", value: String(d.totalMedicinesDispensed ?? 0), tone: "accent" as const },
          { icon: Activity, label: "Patients Today", value: String(d.patientsToday ?? 0), tone: "success" as const },
          { icon: Package, label: "Total Stock", value: String(d.totalStock ?? 0), tone: "warning" as const },
          { icon: Tent, label: "Active Camps", value: String(d.activeCamps ?? 0), tone: "primary" as const },
          { icon: Users, label: "Completed", value: String(d.completedPatients ?? 0), tone: "success" as const },
        ].map((s) => (
          <motion.div key={s.label} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="p-5 lg:col-span-2 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Disease distribution</h3>
              <p className="text-xs text-muted-foreground">Top diagnoses</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseases}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="count" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 card-elevated">
          <h3 className="font-semibold">Age distribution</h3>
          <p className="text-xs text-muted-foreground mb-3">Patients by age band</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="band" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="count" fill={COLORS[1]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="p-5 card-elevated">
          <h3 className="font-semibold">Gender ratio</h3>
          <p className="text-xs text-muted-foreground mb-3">All patients</p>
          <div className="space-y-3 mt-4">
            {genderDist.map((g: any, i: number) => {
              const total = genderDist.reduce((a: number, b: any) => a + b.count, 0);
              const pct = total > 0 ? Math.round((g.count / total) * 100) : 0;
              return (
                <div key={g.gender}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{g.gender}</span>
                    <span className="font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 card-elevated">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Top prescribed</h3>
              <p className="text-xs text-muted-foreground">Most-issued medicines</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {topMeds.map((m: any, i: number) => (
              <div key={m.medicine} className="flex items-center gap-3">
                <div className="size-7 grid place-items-center rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.medicine}</div>
                  <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${topMeds[0]?.count ? (m.count / topMeds[0].count) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{m.count}</div>
              </div>
            ))}
            {topMeds.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No prescriptions yet</div>}
          </div>
        </Card>

        <Card className="lg:col-span-1 p-5 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Active & upcoming camps</h3>
          </div>
          <div className="space-y-2">
            {camps.slice(0, 4).map((c: any) => (
              <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition">
                <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                  <Tent className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.location}</div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    c.status === "Active" ? "bg-success/10 text-success border-success/30"
                    : c.status === "Scheduled" ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground"
                  }
                >
                  {c.status}
                </Badge>
              </div>
            ))}
            {camps.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No camps yet</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
