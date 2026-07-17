import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app-shell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QrCode, Check, Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { createPatient } from "@/lib/powersync/mutations";

const schema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  age: z.coerce.number().min(0).max(120),
  gender: z.enum(["M", "F", "O"]),
  blood: z.string().min(1),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  village: z.string().min(1),
  address: z.string().min(1).max(200),
  emergency: z.string().min(10).max(20),
  members: z.coerce.number().min(1).max(20),
});

export const Route = createFileRoute("/_app/patients/new")({
  component: NewPatient,
});

function NewPatient() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", age: 0, gender: "M", blood: "O+", phone: "", email: "", village: "", address: "", emergency: "", members: 1 },
  });

  const submit = form.handleSubmit(async (data) => {
    try {
      const result = await createPatient({
        name: data.name,
        age: Number(data.age),
        gender: data.gender === "O" ? "Other" : data.gender,
        village: data.village,
        phone: data.phone,
        priority: "normal",
      });

      setToken(result.token);
      toast.success(`Patient registered · Token ${result.token} issued`);
    } catch (err: any) {
      toast.error(err.message || "Failed to register patient");
    }
  });

  if (token) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <Card className="p-8 md:p-10 card-elevated text-center">
          <div className="mx-auto size-14 rounded-full bg-success/15 text-success grid place-items-center mb-4">
            <Check className="size-7" />
          </div>
          <h2 className="text-2xl font-bold">Patient registered</h2>
          <p className="text-muted-foreground mt-1">Household health card generated successfully</p>

          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-muted/50 grid place-items-center">
              <div className="size-48 rounded-2xl bg-card border-2 border-dashed grid place-items-center">
                <QrCode className="size-32 text-primary" strokeWidth={1.2} />
              </div>
              <div className="mt-3 text-xs text-muted-foreground">Scan to open the family card</div>
            </div>
            <div className="text-left space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Token</div>
                <div className="text-4xl font-bold text-primary">{token}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Household Card ID</div>
                <div className="font-mono font-semibold">HH-{Math.floor(Math.random() * 90000 + 10000)}</div>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Next stop: Vitals</Badge>
              <Badge variant="outline" className="bg-success/10 text-success border-success/30 ml-2">
                ✓ Saved offline
              </Badge>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Button variant="outline" className="gap-2 rounded-xl"><Copy className="size-4" /> Copy Token</Button>
            <Button variant="outline" className="gap-2 rounded-xl"><Printer className="size-4" /> Print Card</Button>
            <Button className="gap-2 rounded-xl" onClick={() => navigate({ to: "/queue" })}>Send to Queue →</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <PageHeader title="Register new patient" subtitle="Capture personal, contact and household details." />
      <Card className="p-6 md:p-8 card-elevated">
        <form onSubmit={submit} className="space-y-6">
          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Personal</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full name" error={form.formState.errors.name?.message}>
                <Input {...form.register("name")} placeholder="e.g. Lakshmi Devi" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Age"><Input type="number" {...form.register("age")} /></Field>
                <Field label="Gender">
                  <Select defaultValue="M" onValueChange={(v) => form.setValue("gender", v as "M" | "F" | "O")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                      <SelectItem value="O">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Blood">
                  <Select defaultValue="O+" onValueChange={(v) => form.setValue("blood", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Contact</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Phone" error={form.formState.errors.phone?.message}><Input {...form.register("phone")} placeholder="+91 98450 12345" /></Field>
              <Field label="Email (optional)"><Input {...form.register("email")} placeholder="patient@example.com" /></Field>
              <Field label="Village" error={form.formState.errors.village?.message}><Input {...form.register("village")} /></Field>
              <Field label="Emergency contact" error={form.formState.errors.emergency?.message}><Input {...form.register("emergency")} /></Field>
              <div className="md:col-span-2">
                <Field label="Address" error={form.formState.errors.address?.message}>
                  <Textarea {...form.register("address")} rows={2} />
                </Field>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Household</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Family members"><Input type="number" {...form.register("members")} /></Field>
            </div>
          </section>

          <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate({ to: "/patients" })}>Cancel</Button>
            <Button type="submit" className="rounded-xl gap-2">
              Register & Generate Token
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
