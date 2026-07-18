import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { ChevronLeft } from "lucide-react";
import { usePatient } from "@/hooks/use-patients";

export const Route = createFileRoute("/_app/patients/$id")({
  component: PatientDetailsPage,
});

function PatientDetailsPage() {
  const { id } = Route.useParams();
  const { patient, isLoading } = usePatient(id);

  if (isLoading) return <div className="p-8">Loading patient details...</div>;
  if (!patient) return <div className="p-8 text-destructive">Patient not found</div>;

  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto">
      <Button variant="ghost" asChild className="mb-4 -ml-4 text-muted-foreground hover:text-foreground">
        <Link to="/patients"><ChevronLeft className="mr-2 size-4" /> Back to Patients</Link>
      </Button>
      
      <PageHeader
        title={patient.name}
        subtitle={`Patient ID: ${patient.id} • Registered on ${new Date(patient.createdAt).toLocaleDateString()}`}
      />

      <Card className="p-6 mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground block">Age / Gender</span>
            <span className="font-medium">{patient.age} years • {patient.gender}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Contact</span>
            <span className="font-medium">{patient.phone || "No phone provided"}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Location</span>
            <span className="font-medium">{patient.village}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block">Current Status</span>
            <Badge variant="outline">{patient.status}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
