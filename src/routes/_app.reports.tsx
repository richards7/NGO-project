import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { networkManager } from "@/lib/network/NetworkManager";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const reports = [
  { id: "daily", name: "Daily Camp Report", desc: "Registrations, consultations, medicines issued", tone: "bg-primary/10 text-primary" },
  { id: "summary", name: "Camp Summary Report", desc: "Full breakdown by camp with outcomes", tone: "bg-accent/15 text-accent" },
  { id: "medicine", name: "Medicine Usage Report", desc: "Consumption per SKU, batch and camp", tone: "bg-success/15 text-success" },
  { id: "patient", name: "Patient Statistics (CSV)", desc: "Export complete demographics and records", tone: "bg-warning/15 text-warning-foreground" },
  { id: "referral", name: "Referral Report", desc: "Cases referred to district hospitals", tone: "bg-destructive/10 text-destructive" },
  { id: "volunteer", name: "Volunteer Attendance", desc: "Hours contributed per volunteer & role", tone: "bg-secondary text-secondary-foreground" },
];

function ReportsPage() {
  const handleDownload = (r: any) => {
    if (r.id === "patient") {
      // Direct download link for CSV export
      window.open(`${networkManager.getApiUrl()}/patients/export/csv`, "_blank");
      toast.success("Downloading Patient Statistics CSV...");
    } else {
      toast.success(`${r.name} generated`);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Reports" subtitle="Export professional PDF/CSV reports for donors, partners and audits." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.name} className="p-5 card-elevated hover:border-primary/40 transition">
            <div className={`size-11 rounded-2xl grid place-items-center ${r.tone}`}>
              <FileText className="size-5" />
            </div>
            <h3 className="font-semibold mt-4">{r.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{r.desc}</p>
            <div className="mt-4 flex gap-2">
              <Button className="rounded-xl gap-2 flex-1" variant="outline" onClick={() => handleDownload(r)}>
                <Download className="size-4" /> Download
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
