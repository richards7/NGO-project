import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app-shell";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CalendarDays, MapPin, Plus, Stethoscope, Tent, Users } from "lucide-react";
import { toast } from "sonner";
import { useCamps } from "@/hooks/use-prescriptions";
import { createCamp } from "@/lib/powersync/mutations";

export const Route = createFileRoute("/_app/camps")({
  component: CampsPage,
});

function CampsPage() {
  const { data: camps } = useCamps();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCamp({
        name,
        location,
        date: new Date(date).toISOString(),
        campCode: name.substring(0, 3).toUpperCase() + "-" + Math.floor(Math.random() * 1000)
      });
      toast.success("Camp created successfully");
      setOpen(false);
      setName(""); setLocation(""); setDate("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create camp");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Camps"
        subtitle="Plan, schedule and monitor medical camps across regions."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl"><Plus className="size-4" /> New Camp</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create a new camp</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5"><Label>Camp Name</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rural Wellness Camp" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Location</Label><Input required value={location} onChange={e => setLocation(e.target.value)} placeholder="Village, State" /></div>
                  <div className="space-y-1.5"><Label>Date</Label><Input required value={date} onChange={e => setDate(e.target.value)} type="date" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Doctors</Label><Input type="number" defaultValue={3} /></div>
                  <div className="space-y-1.5"><Label>Volunteers</Label><Input type="number" defaultValue={8} /></div>
                </div>
                <div className="space-y-1.5"><Label>Medicines allocated</Label><Textarea placeholder="Paracetamol · 500 units, ORS · 200 sachets…" /></div>
                <DialogFooter><Button type="submit" className="rounded-xl">Create camp</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(camps ?? []).map((c: any) => (
          <Card key={c.id} className="p-5 card-elevated hover:border-primary/40 transition group">
            <div className="flex items-start justify-between">
              <div className="size-11 rounded-2xl gradient-brand text-white grid place-items-center group-hover:scale-105 transition">
                <Tent className="size-5" />
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
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">{c.camp_code}</div>
              <h3 className="font-semibold text-lg leading-tight mt-0.5">{c.name}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" /> {c.location}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" /> {new Date(c.date).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t">
              <div><div className="text-lg font-bold">3</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1"><Stethoscope className="size-3" /> Doctors</div></div>
              <div><div className="text-lg font-bold">8</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1"><Users className="size-3" /> Volunt.</div></div>
              <div><div className="text-lg font-bold">0</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider">Patients</div></div>
            </div>
          </Card>
        ))}
        {(!camps || camps.length === 0) && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">
            No camps found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
