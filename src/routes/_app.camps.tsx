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
import { CalendarDays, MapPin, Plus, Stethoscope, Tent, Users, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useCamps } from "@/hooks/use-prescriptions";
import { createCamp } from "@/lib/powersync/mutations";
import { networkManager } from "@/lib/network/NetworkManager";

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success("Camp Code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCamp({
        name,
        location,
        date: new Date(date).toISOString(),
      });
      toast.success("Camp created successfully");
      setOpen(false);
      setName(""); setLocation(""); setDate("");
    } catch (e: any) {
      toast.error(e.message || "Failed to create camp");
    }
  };

  const handleExport = async (campId: string, campCode: string) => {
    try {
      toast.info("Preparing export...");
      const token = localStorage.getItem("campcare.token");
      const baseUrl = networkManager.getApiUrl();
      const res = await fetch(`${baseUrl}/export/${campId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to export data");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `camp_${campCode}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Export successful");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
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
              <div className="flex items-center gap-2">
                <Button size="icon" variant="ghost" onClick={() => handleExport(c.id, c.campCode || c.camp_code)} title="Export to Excel">
                  <Download className="size-4" />
                </Button>
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
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="font-mono text-xs cursor-pointer hover:bg-secondary/80 transition-colors" onClick={() => copyToClipboard(c.id, c.campCode || c.camp_code)} title="Copy Camp Code">
                  {c.campCode || c.camp_code}
                  {copiedCode === c.id ? <Check className="size-3 ml-1 text-success" /> : <Copy className="size-3 ml-1 opacity-70" />}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg leading-tight mt-0.5">{c.name}</h3>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5" /> {c.location}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5" /> {new Date(c.date).toLocaleDateString()}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t">
              <div><div className="text-lg font-bold">{c.users?.filter((u: any) => u.role_id === 'role-doctor' || u.roleId === 'role-doctor')?.length || 0}</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1"><Stethoscope className="size-3" /> Doctors</div></div>
              <div><div className="text-lg font-bold">{c.users?.filter((u: any) => u.role_id !== 'role-doctor' && u.roleId !== 'role-doctor')?.length || 0}</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider flex items-center gap-1"><Users className="size-3" /> Staff</div></div>
              <div><div className="text-lg font-bold">{c._count?.patients || 0}</div><div className="text-[10px] uppercase text-muted-foreground tracking-wider">Patients</div></div>
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
