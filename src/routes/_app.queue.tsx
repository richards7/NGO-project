import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { AlertTriangle, ArrowRight, Clock, Stethoscope, AlertCircle, Edit, History } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueue, usePharmacyQueue } from "@/hooks/use-queue";
import { useVitals } from "@/hooks/use-vitals";
import type { LocalPatient } from "@/hooks/use-patients";

export const Route = createFileRoute("/_app/queue")({
  component: QueuePage,
});

const columns = [
  { key: "Emergency", label: "Emergency", icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
  { key: "HighPriority", label: "High Priority", icon: AlertCircle, tone: "text-warning-foreground bg-warning/15" },
  { key: "Waiting", label: "General Waiting", icon: Clock, tone: "text-muted-foreground bg-muted" },
  { key: "InConsultation", label: "In Consultation", icon: Stethoscope, tone: "text-primary bg-primary/10" },
];

function QueuePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isDoctor = session?.role === "doctor" || session?.role === "admin";
  const isNurse = session?.role === "registration" || session?.role === "admin";

  // Read from local SQLite — reactive and offline-capable
  const { data: patients } = useQueue();
  const { data: pharmacyQueue } = usePharmacyQueue();

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Smart Queue"
        subtitle="Live patient flow · emergency cases auto-prioritised to the top."
        actions={<Badge variant="outline" className="gap-1.5 bg-success/10 text-success border-success/30"><span className="size-2 rounded-full bg-success animate-pulse" /> Live</Badge>}
      />

      <Tabs defaultValue="active">
        {isDoctor && (
          <TabsList className="mb-6">
            <TabsTrigger value="active">Active Queue</TabsTrigger>
            <TabsTrigger value="completed">Sent to Pharmacy</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="active" className="m-0">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {columns.map((col) => {
              const items = (patients ?? []).filter((p: LocalPatient) => {
                if (col.key === "Emergency") return p.queue_priority === "highest" && p.status !== "In Consultation";
                if (col.key === "HighPriority") return p.queue_priority === "high" && p.status !== "In Consultation";
                if (col.key === "Waiting") return (p.queue_priority === "normal" || p.queue_priority === "medium") && p.status !== "In Consultation";
                if (col.key === "InConsultation") return p.status === "In Consultation";
                return false;
              });
              const Icon = col.icon;
              return (
                <Card key={col.key} className="p-4 card-elevated bg-muted/20 flex flex-col h-full min-h-[600px]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`size-8 rounded-lg grid place-items-center ${col.tone}`}>
                        <Icon className="size-4" />
                      </div>
                      <div className="font-semibold text-sm">{col.label}</div>
                    </div>
                    <Badge variant="outline" className="bg-card">{items.length}</Badge>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {items.length === 0 && (
                      <div className="text-center py-8 text-xs text-muted-foreground">No patients</div>
                    )}
                    {items.map((p, i) => (
                      <QueueCard key={p.id} patient={p} index={i} col={col} isDoctor={isDoctor} isNurse={isNurse} navigate={navigate} />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {isDoctor && (
          <TabsContent value="completed" className="m-0">
            <Card className="card-elevated p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <History className="size-4" /> Recently Sent to Pharmacy
              </h3>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(pharmacyQueue ?? []).map((p) => (
                  <Card key={p.id} className="p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.token}</div>
                        </div>
                        <Badge variant="outline">{p.status}</Badge>
                      </div>
                      <div className="mt-4 text-xs text-muted-foreground">
                        Updated: {new Date(p.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => navigate({ to: `/consultation?patientId=${p.id}` })}>
                        <Edit className="size-3 mr-1.5" /> Edit Prescription
                      </Button>
                    </div>
                  </Card>
                ))}
                {(!pharmacyQueue || pharmacyQueue.length === 0) && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    No patients sent to pharmacy yet.
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/** Individual queue card — loads vitals reactively from local SQLite */
function QueueCard({ patient: p, index: i, col, isDoctor, isNurse, navigate }: {
  patient: LocalPatient;
  index: number;
  col: typeof columns[number];
  isDoctor: boolean;
  isNurse: boolean;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const { data: vitalsData } = useVitals(p.id);
  const vitals = vitalsData?.[0];

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Card className={`p-3 hover:border-primary/40 transition ${col.key === "Emergency" ? "border-destructive/40 bg-destructive/5" : ""}`}>
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{p.name}</div>
            <div className="text-xs text-muted-foreground">{p.token} · {p.age}y</div>
          </div>
        </div>
        {p.queue_reason && p.queue_reason !== "Normal" && (
          <div className="mt-2 text-[10px] font-medium text-destructive truncate">
            Alert: {p.queue_reason}
          </div>
        )}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px]">
          {vitals?.bp && <Badge variant="outline" className="font-mono">{vitals.bp}</Badge>}
          {vitals && vitals.spo2 > 0 && <Badge variant="outline">SpO₂ {vitals.spo2}</Badge>}
          {vitals && vitals.temp > 0 && <Badge variant="outline">{vitals.temp}°F</Badge>}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">{p.village}</span>
          
          <div className="flex gap-2">
            {isNurse && col.key !== "InConsultation" && (
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => navigate({ to: `/vitals?patientId=${p.id}` })}>
                <Edit className="size-3 mr-1" /> Vitals
              </Button>
            )}
            {isDoctor && col.key !== "InConsultation" && (
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-primary text-xs" onClick={() => navigate({ to: `/consultation?patientId=${p.id}` })}>
                Consult <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
          {!isDoctor && !isNurse && p.queued_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(p.queued_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
