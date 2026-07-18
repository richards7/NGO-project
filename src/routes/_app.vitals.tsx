import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Droplet, HeartPulse, Save, Thermometer, Wind, Scale, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { usePatient, usePatients } from "@/hooks/use-patients";
import { useVitals } from "@/hooks/use-vitals";
import { createVitals } from "@/lib/powersync/mutations";

export const Route = createFileRoute("/_app/vitals")({
  validateSearch: (search: Record<string, unknown>) => ({
    patientId: search.patientId as string | undefined,
  }),
  component: VitalsPage,
});

function VitalsPage() {
  const { patientId } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(patientId);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Read patient and vitals from local SQLite
  const { patient } = usePatient(selectedPatientId);
  const { data: existingVitals } = useVitals(selectedPatientId);
  const { data: searchResults } = usePatients(debouncedSearch || undefined);

  // Vitals State
  const [bpSys, setBpSys] = useState("120");
  const [bpDia, setBpDia] = useState("80");
  const [sugar, setSugar] = useState("95");
  const [temp, setTemp] = useState("98.6");
  const [pulse, setPulse] = useState("72");
  const [spo2, setSpo2] = useState("98");
  const [weight, setWeight] = useState("60");
  const [height, setHeight] = useState("165");
  const [pregnancyStatus, setPregnancyStatus] = useState("none");
  const [emergency, setEmergency] = useState(false);
  const [notes, setNotes] = useState("");

  const bmi = (weight && height) ? ((Number(weight) / ((Number(height) / 100) ** 2))).toFixed(1) : "--";

  const [isEdit, setIsEdit] = useState(false);

  // Load existing vitals into the form if available
  useEffect(() => {
    if (existingVitals && existingVitals.length > 0) {
      const v = existingVitals[0];
      const [s, d] = (v.bp || "120/80").split("/");
      setBpSys(s);
      setBpDia(d);
      setSugar(v.sugar?.toString() || "");
      setTemp(v.temp?.toString() || "");
      setPulse(v.pulse?.toString() || "");
      setSpo2(v.spo2?.toString() || "");
      setWeight(v.weight?.toString() || "");
      setHeight(v.height?.toString() || "");
      setPregnancyStatus(v.pregnancyStatus || "none");
      setEmergency(v.emergencyCondition === 1);
      setNotes(v.notes || "");
      setIsEdit(true);
    }
  }, [existingVitals]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    clearTimeout((window as any).__vitalsSearchTimer);
    (window as any).__vitalsSearchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const save = async () => {
    if (!patient) return toast.error("Select a patient first");
    try {
      await createVitals({
        patientId: patient.id,
        bp: `${bpSys}/${bpDia}`,
        sugar: Number(sugar),
        temp: Number(temp),
        pulse: Number(pulse),
        spo2: Number(spo2),
        weight: Number(weight),
        height: Number(height),
        pregnancyStatus: pregnancyStatus === "none" ? undefined : pregnancyStatus,
        emergencyCondition: emergency,
        notes: notes || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["vitals", patient.id] });
      queryClient.invalidateQueries({ queryKey: ["patient", patient.id] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });

      toast.success(isEdit ? "Vitals updated · saved offline" : "Vitals saved · patient sent to Queue");
      navigate({ to: "/queue" });
    } catch (e: any) {
      toast.error(e.message || "Failed to save vitals");
    }
  };

  if (!patient) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <PageHeader title="Select Patient" subtitle="Search for a registered patient to capture vitals" />
        <Card className="p-6 card-elevated">
          <div className="flex gap-2">
            <Input 
              placeholder="Search by name, token or phone..." 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Button onClick={() => setDebouncedSearch(searchQuery)}><Search className="size-4 mr-2"/> Search</Button>
          </div>
          <div className="mt-4 space-y-2">
            {(searchResults ?? []).map((p: any) => (
              <Card key={p.id} className="p-3 flex justify-between items-center cursor-pointer hover:border-primary/50" onClick={() => setSelectedPatientId(p.id)}>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">Token: {p.token} | Age: {p.age} | {p.village}</div>
                </div>
                <Button variant="ghost" size="sm">Select</Button>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title={isEdit ? "Edit Vitals" : "Vitals capture"}
        subtitle={`Recording vitals for ${patient.name} · Token ${patient.token}`}
        actions={
          <Button className="gap-2 rounded-xl" onClick={save}>
            <Save className="size-4" /> {isEdit ? "Update Vitals" : "Save & Send to Queue"}
          </Button>
        }
      />

      <Card className="p-5 mb-4 bg-primary/5 border-primary/20">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Patient</div>
            <div className="font-semibold text-lg">{patient.name}</div>
            <div className="text-sm text-muted-foreground">{patient.age}y · {patient.gender} · {patient.village}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Token</div>
            <div className="text-2xl font-bold text-primary">{patient.token}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedPatientId(undefined)}>Change Patient</Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-5 card-elevated hover:border-primary/40 transition">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-xl grid place-items-center text-destructive bg-destructive/10"><HeartPulse className="size-5" /></div>
            <span className="text-xs text-muted-foreground">mmHg</span>
          </div>
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Blood Pressure</Label>
            <div className="flex items-center gap-2">
              <Input value={bpSys} onChange={(e) => setBpSys(e.target.value)} className="text-xl font-bold h-12 text-center" />
              <span className="text-xl text-muted-foreground">/</span>
              <Input value={bpDia} onChange={(e) => setBpDia(e.target.value)} className="text-xl font-bold h-12 text-center" />
            </div>
          </div>
        </Card>

        <VitalCard icon={Droplet} tone="text-primary bg-primary/10" label="Blood Sugar" unit="mg/dL" value={sugar} onChange={setSugar} />
        <VitalCard icon={Thermometer} tone="text-warning-foreground bg-warning/15" label="Temperature" unit="°F" value={temp} onChange={setTemp} />
        <VitalCard icon={Activity} tone="text-accent bg-accent/15" label="Pulse" unit="bpm" value={pulse} onChange={setPulse} />
        <VitalCard icon={Wind} tone="text-success bg-success/15" label="Oxygen Saturation (SpO₂)" unit="%" value={spo2} onChange={setSpo2} />
        
        <Card className="p-5 card-elevated">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-xl bg-secondary/40 text-secondary-foreground grid place-items-center">
              <Scale className="size-5" />
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">BMI (auto)</div>
              <div className="text-2xl font-bold text-primary">{bmi}</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight (kg)</Label>
              <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Height (cm)</Label>
              <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <Card className="p-5 card-elevated">
          <Label className="text-sm font-semibold">Additional Information</Label>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Pregnancy Status</Label>
              <Select value={pregnancyStatus} onValueChange={setPregnancyStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Applicable / None</SelectItem>
                  <SelectItem value="pregnant">Pregnant</SelectItem>
                  <SelectItem value="postpartum">Postpartum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="emergency" checked={emergency} onCheckedChange={(c) => setEmergency(c as boolean)} />
              <label htmlFor="emergency" className="text-sm font-medium leading-none text-destructive flex items-center gap-2">
                <AlertTriangle className="size-4" /> Mark as Emergency Condition
              </label>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 card-elevated">
          <Label className="text-sm font-semibold">Notes for the doctor</Label>
          <Textarea 
            className="mt-2" 
            rows={4} 
            placeholder="e.g. Patient reports mild chest discomfort in the morning…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>
      </div>
    </div>
  );
}

function VitalCard({
  icon: Icon, tone, label, unit, value, onChange
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  unit: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <Card className="p-5 card-elevated hover:border-primary/40 transition">
      <div className="flex items-center justify-between">
        <div className={`size-10 rounded-xl grid place-items-center ${tone}`}>
          <Icon className="size-5" />
        </div>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="mt-4 space-y-1.5">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
        <Input 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-2xl font-bold h-12 border-0 border-b rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary" 
        />
      </div>
    </Card>
  );
}
