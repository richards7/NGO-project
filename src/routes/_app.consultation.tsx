import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app-shell";
import { CalendarDays, Check, Eraser, Plus, Send, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { usePatient } from "@/hooks/use-patients";
import { useVitals } from "@/hooks/use-vitals";
import { useMedicines } from "@/hooks/use-medicines";
import { usePrescriptions } from "@/hooks/use-prescriptions";
import { useCamps } from "@/hooks/use-prescriptions";
import { createPrescription } from "@/lib/powersync/mutations";

export const Route = createFileRoute("/_app/consultation")({
  validateSearch: (search: Record<string, unknown>) => ({
    patientId: search.patientId as string | undefined,
  }),
  component: ConsultationPage,
});

interface RxLine { medicineId: string; name: string; dose: string; duration: string; instructions: string; }

function ConsultationPage() {
  const { patientId } = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Read from local SQLite
  const { patient } = usePatient(patientId);
  const { data: vitalsData } = useVitals(patientId);
  const { data: medicines } = useMedicines();
  const { data: camps } = useCamps();
  const { data: prescriptionHistory } = usePrescriptions(patientId);

  const [rx, setRx] = useState<RxLine[]>([]);
  const [advice, setAdvice] = useState("");
  const [medSearchOpen, setMedSearchOpen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const addMed = (m: any) => {
    setRx((r) => [...r, { medicineId: m.id, name: m.name || m.medicine_name, dose: "1-0-1", duration: "7 days", instructions: "After meals" }]);
    setMedSearchOpen(false);
  };
  const removeMed = (i: number) => setRx((r) => r.filter((_, idx) => idx !== i));
  const updateMed = (i: number, key: keyof RxLine, value: string) => {
    setRx(r => r.map((item, idx) => idx === i ? { ...item, [key]: value } : item));
  };

  const startDraw = (e: React.PointerEvent) => {
    drawing.current = true;
    const c = canvas.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "oklch(0.22 0.03 250)"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
  };
  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = canvas.current!; const r = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke();
  };
  const stopDraw = () => { drawing.current = false; };
  const clearSig = () => {
    const c = canvas.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  };

  const sendToPharmacy = async () => {
    if (!patient) return toast.error("No patient selected");
    if (rx.length === 0) return toast.error("Add at least one medicine");
    const activeCamp = (camps ?? []).find((c: any) => c.status === "Active") || (camps ?? [])[0];
    if (!activeCamp) return toast.error("No active camp found");

    try {
      await createPrescription({
        patientId: patient.id,
        campId: activeCamp.id,
        doctorId: session?.email ?? "unknown",
        advice: advice || undefined,
        medicines: rx.map(r => ({
          medicineId: r.medicineId,
          dosage: r.dose,
          frequency: r.dose,
          duration: r.duration,
        })),
      });

      toast.success("Prescription saved offline · patient sent to pharmacy");
      navigate({ to: "/queue" });
    } catch (e: any) {
      toast.error(e.message || "Failed to save prescription");
    }
  };

  if (!patientId) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Search className="size-8" />
        </div>
        <h2 className="text-2xl font-bold">No Patient Selected</h2>
        <p className="text-muted-foreground mt-2 mb-6 max-w-md">Please select a patient from the Smart Queue to start their consultation.</p>
        <Button asChild><a href="/queue">Go to Queue</a></Button>
      </div>
    );
  }

  if (!patient) return null;

  const vitals = vitalsData?.[0] || {} as any;
  const history = prescriptionHistory ?? [];

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <PageHeader
          title="Consultation"
          subtitle="A4 prescription · digitally signed & shared instantly."
          actions={
            <>
              <Button variant="outline" className="rounded-xl">Preview</Button>
              <Button className="rounded-xl gap-2" onClick={sendToPharmacy}>
                <Send className="size-4" /> Send to Pharmacy
              </Button>
            </>
          }
        />

        {/* A4 preview */}
        <Card className="card-elevated p-6 md:p-10 bg-card min-h-[900px]">
          <header className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="text-2xl font-bold gradient-brand bg-clip-text text-transparent">Arogya Camp OS</div>
              <div className="text-xs text-muted-foreground mt-0.5">Rural Wellness Camp · {(camps ?? []).find((c: any) => c.status === "Active")?.location || "Nandigama, AP"}</div>
            </div>
            <div className="text-right text-xs">
              <div className="font-semibold">{session?.name || "Dr. Vikram Iyer"}</div>
              <div className="text-muted-foreground">Doctor</div>
              <div className="text-muted-foreground mt-1">{new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</div>
            </div>
          </header>

          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b">
            <Info label="Patient" value={patient.name} />
            <Info label="Age / Gender" value={`${patient.age}y · ${patient.gender}`} />
            <Info label="Token" value={patient.token ?? "—"} />
            <Info label="Card ID" value={patient.id.substring(0, 8)} />
          </section>

          <section className="py-4 border-b">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Vitals</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {vitals.bp && <Badge variant="outline">BP {vitals.bp}</Badge>}
              {vitals.sugar > 0 && <Badge variant="outline">Sugar {vitals.sugar} mg/dL</Badge>}
              {vitals.temp > 0 && <Badge variant="outline">Temp {vitals.temp}°F</Badge>}
              {vitals.pulse > 0 && <Badge variant="outline">Pulse {vitals.pulse}</Badge>}
              {vitals.spo2 > 0 && <Badge variant="outline">SpO₂ {vitals.spo2}%</Badge>}
              {vitals.weight && vitals.weight > 0 && <Badge variant="outline">Weight {vitals.weight}kg</Badge>}
            </div>
            {vitals.notes && <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">Notes: {vitals.notes}</div>}
          </section>

          <section className="py-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">℞ Prescription</div>
              <Popover open={medSearchOpen} onOpenChange={setMedSearchOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1 rounded-lg"><Plus className="size-3.5" /> Add Medicine</Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="p-0 w-72">
                  <Command>
                    <CommandInput placeholder="Search medicines…" />
                    <CommandList>
                      <CommandGroup>
                        {(medicines ?? []).map((m: any) => (
                          <CommandItem key={m.id} value={m.name} onSelect={() => addMed(m)}>
                            <div className="w-full cursor-pointer">
                              <div className="text-sm font-medium">{m.name}</div>
                              <div className="text-xs text-muted-foreground">{m.category_name || "Medicine"} · stock {m.stock}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              {rx.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-muted/40">
                  <div className="col-span-12 md:col-span-4 font-medium text-sm">{i + 1}. {line.name}</div>
                  <Input className="col-span-4 md:col-span-2 h-9" value={line.dose} onChange={(e) => updateMed(i, "dose", e.target.value)} placeholder="Dose (1-0-1)" />
                  <Input className="col-span-4 md:col-span-2 h-9" value={line.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} placeholder="Duration" />
                  <Input className="col-span-4 md:col-span-3 h-9" value={line.instructions} onChange={(e) => updateMed(i, "instructions", e.target.value)} placeholder="Instructions" />
                  <Button variant="ghost" size="icon" className="col-span-12 md:col-span-1 h-9 w-9 justify-self-end" onClick={() => removeMed(i)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {rx.length === 0 && <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">No medicines added</div>}
            </div>
          </section>

          <section className="py-4 border-b">
            <Label className="text-sm font-semibold">Doctor's advice</Label>
            <Textarea 
              rows={3} 
              className="mt-2" 
              placeholder="e.g. Reduce salt intake. Walk 30 mins daily. Monitor BP twice daily."
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
            />
          </section>

          <section className="py-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Follow-up date</Label>
              <div className="mt-2 flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                <Input type="date" className="h-9 w-44" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Digital signature</div>
              <canvas
                ref={canvas} width={240} height={80}
                className="border rounded-lg bg-muted/30 touch-none cursor-crosshair"
                onPointerDown={startDraw} onPointerMove={draw} onPointerUp={stopDraw} onPointerLeave={stopDraw}
              />
              <div className="mt-1 flex justify-end gap-1">
                <Button size="sm" variant="ghost" onClick={clearSig} className="h-7 gap-1 text-xs"><Eraser className="size-3" /> Clear</Button>
              </div>
            </div>
          </section>
        </Card>
      </div>

      {/* Right sidebar */}
      <div className="space-y-4">
        <Card className="p-5 card-elevated">
          <h3 className="font-semibold text-sm">Previous history</h3>
          <div className="mt-3 space-y-2">
            {history.length === 0 && <div className="text-xs text-muted-foreground">No previous history</div>}
            {history.map((h: any) => (
              <div key={h.id} className="flex gap-3 text-xs">
                <div className="w-16 shrink-0 text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</div>
                <div className="flex-1">{h.advice || "Consultation completed"}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 card-elevated">
          <h3 className="font-semibold text-sm">Previous prescriptions</h3>
          <div className="mt-3 space-y-2">
            {history.length === 0 && <div className="text-xs text-muted-foreground">No previous prescriptions</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
    </div>
  );
}
