import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app-shell";
import { Check, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePharmacyQueue } from "@/hooks/use-queue";
import { useVitals } from "@/hooks/use-vitals";
import { useMedicines } from "@/hooks/use-medicines";
import { usePrescriptions, useCamps } from "@/hooks/use-prescriptions";
import { dispenseMedicine, createFeedback, createMedicine } from "@/lib/powersync/mutations";
import { useAuth } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

export const Route = createFileRoute("/_app/pharmacy")({
  component: PharmacyPage,
});

function PharmacyPage() {
  const { session } = useAuth();
  const { data: queue } = usePharmacyQueue();
  const { data: medicines } = useMedicines();
  const queryClient = useQueryClient();
  
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [activePatient, setActivePatient] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState("");
  const [dispenseQuantities, setDispenseQuantities] = useState<Record<string, number>>({});

  const [addMedOpen, setAddMedOpen] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", category: "category-id-1", stock: 100 });

  const handleDispenseAndFeedback = async () => {
    if (!activePatient) return;
    try {
      const rx = activePatient._prescription;
      if (!rx) throw new Error("No prescription found");

      await dispenseMedicine(rx.id, rx.campId, session?.email ?? "unknown", dispenseQuantities);

      await createFeedback({
        patientId: activePatient.id,
        campId: rx.campId,
        rating,
        comments,
      });

      queryClient.invalidateQueries({ queryKey: ["pharmacyQueue"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      toast.success("Medicines dispensed & feedback submitted · saved offline");
      setFeedbackOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to complete workflow");
    }
  };

  const handleAddMedicine = async () => {
    if (!newMed.name) return toast.error("Name is required");
    try {
      await createMedicine({
        name: newMed.name,
        categoryId: newMed.category, // In a real app this would be a select dropdown
        stock: newMed.stock,
      });
      toast.success("Medicine added successfully");
      setAddMedOpen(false);
      setNewMed({ name: "", category: "category-id-1", stock: 100 });
    } catch (e: any) {
      toast.error("Failed to add medicine");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Pharmacy" subtitle="Verify prescriptions, issue medicines and manage inventory." />

      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="queue">Dispensing Queue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="card-elevated">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Incoming prescriptions</h3>
              <Badge variant="outline">{(queue ?? []).length} in queue</Badge>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead className="hidden md:table-cell">Village</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(queue ?? []).map((p: any) => (
                    <PharmacyRow
                      key={p.id}
                      patient={p}
                      onDispense={(patient, rx) => {
                        setActivePatient({ ...patient, _prescription: rx });
                        setFeedbackOpen(true);
                        setRating(5);
                        setComments("");
                        setDispenseQuantities({});
                      }}
                    />
                  ))}
                  {(!queue || queue.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No patients waiting for pharmacy.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card className="card-elevated">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Medicine Inventory</h3>
              <Dialog open={addMedOpen} onOpenChange={setAddMedOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Add Medicine</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add New Medicine</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Medicine Name</Label>
                      <Input value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Initial Stock Quantity</Label>
                      <Input type="number" value={newMed.stock} onChange={(e) => setNewMed({ ...newMed, stock: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddMedOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddMedicine}>Save Medicine</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medicine Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Stock Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(medicines ?? []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category_name || "General"}</TableCell>
                      <TableCell>{m.batch_number}</TableCell>
                      <TableCell>
                        <Badge variant={m.stock < m.alert_level ? "destructive" : "secondary"}>
                          {m.stock} units
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!medicines || medicines.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No medicines in inventory.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Pharmacy Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="border rounded-md p-4 bg-muted/30">
              <h4 className="text-sm font-semibold mb-3">Quantities to Dispense</h4>
              <div className="space-y-3">
                {activePatient?._prescription && <PrescriptionMedicineQuantities 
                  prescriptionId={activePatient._prescription.id} 
                  quantities={dispenseQuantities}
                  onChange={(id, qty) => setDispenseQuantities(q => ({ ...q, [id]: qty }))}
                />}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Rating (1-5)</div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <Button 
                    key={num} 
                    variant={rating === num ? "default" : "outline"} 
                    onClick={() => setRating(num)}
                    className="w-10 h-10 p-0"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Comments (Optional)</div>
              <Textarea 
                placeholder="How was the patient's experience at the camp?" 
                value={comments} 
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={handleDispenseAndFeedback}>Complete Dispense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrescriptionMedicineQuantities({ prescriptionId, quantities, onChange }: { 
  prescriptionId: string; 
  quantities: Record<string, number>;
  onChange: (medicineId: string, qty: number) => void;
}) {
  const { data: rxMeds } = useQuery({
    queryKey: ["prescriptionMeds", prescriptionId],
    queryFn: async () => {
      const res = await apiRequest(`/consultation/prescriptions/${prescriptionId}`);
      if (!res.data || !res.data.medicines) return [];
      
      return res.data.medicines.map((m: any) => ({
        medicine_id: m.medicineId,
        medicine_name: m.medicine?.name || m.medicine_name,
        dosage: m.dosage,
        duration: m.duration
      })) as { medicine_id: string; medicine_name: string; dosage: string; duration: string; }[];
    },
    enabled: !!prescriptionId
  });

  return (
    <>
      {(rxMeds ?? []).map(med => (
        <div key={med.medicine_id} className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="text-sm font-medium">{med.medicine_name}</div>
            <div className="text-xs text-muted-foreground">{med.dosage} for {med.duration}</div>
          </div>
          <Input 
            type="number" 
            className="w-20 h-8 text-right" 
            placeholder="Qty"
            value={quantities[med.medicine_id] || ""}
            onChange={(e) => onChange(med.medicine_id, parseInt(e.target.value) || 0)}
          />
        </div>
      ))}
      {rxMeds?.length === 0 && <div className="text-xs text-muted-foreground">No medicines prescribed.</div>}
    </>
  );
}

/** Individual pharmacy row — loads prescription data reactively */
function PharmacyRow({ patient, onDispense }: {
  patient: any;
  onDispense: (patient: any, rx: any) => void;
}) {
  const { data: prescriptions } = usePrescriptions(patient.id);
  const rx = prescriptions?.[0];

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-sm">{patient.name}</div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{patient.token}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{patient.village}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {new Date(patient.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </TableCell>
      <TableCell>
        {patient.status === "Completed" ? (
          <Badge variant="outline" className="bg-success/10 text-success border-success/30">
            Dispensed
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30">
            Pending
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => toast.success("Receipt printed")}><Printer className="size-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => toast.success("PDF downloaded")}><Download className="size-3.5" /></Button>
          {patient.status !== "Completed" && rx ? (
            <Button size="sm" className="h-8 gap-1 rounded-lg" onClick={() => onDispense(patient, rx)}>
              <Check className="size-3.5" /> Issue & Feedback
            </Button>
          ) : (
            <Button size="sm" variant="secondary" className="h-8 gap-1 rounded-lg opacity-50 cursor-not-allowed">
              <Check className="size-3.5" /> Dispensed
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
