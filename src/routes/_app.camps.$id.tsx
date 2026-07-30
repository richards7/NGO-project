import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app-shell";
import { apiRequest } from "@/lib/api";
import {
  CalendarDays,
  MapPin,
  Tent,
  Users,
  Download,
  Copy,
  Check,
  Stethoscope,
  Pill,
  RefreshCw,
  Clock,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { networkManager } from "@/lib/network/NetworkManager";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/camps/$id")({
  component: CampOverviewPage,
});

function CampOverviewPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  const fetchData = async () => {
    try {
      const res = await apiRequest(`/camps/${id}/overview`);
      setData(res.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load camp data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await apiRequest(`/camps/${id}/sync`, { method: "POST" });
      toast.success("Workbook synced successfully");
      fetchData(); // Reload the data
    } catch (e: any) {
      toast.error(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      toast.info("Preparing download...");
      const token = localStorage.getItem("campcare.token");
      const baseUrl = networkManager.getApiUrl();
      const res = await fetch(`${baseUrl}/camps/${id}/workbook`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download workbook");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `camp_${data?.camp?.campCode}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Download complete");
    } catch (e: any) {
      toast.error(e.message || "Download failed");
    }
  };

  const copyToClipboard = () => {
    if (!data?.camp?.campCode) return;
    navigator.clipboard.writeText(data.camp.campCode);
    setCopiedCode(true);
    toast.success("Camp Code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading camp data...</div>;
  }

  if (!data || !data.camp) {
    return <div className="p-8 text-center text-muted-foreground">Camp not found.</div>;
  }

  const { camp, staff, patientSummary, patients, inventory, lastSyncTime } = data;

  const filteredPatients = patients.filter((p: any) =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.token?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/camps">
          <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{camp.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="size-3.5" /> {camp.address}, {camp.district}, {camp.state}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right mr-2 hidden sm:block">
            <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock className="size-3" /> Last Synced
            </div>
            <div className="text-xs font-medium">
              {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"}
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
          <Button className="gap-2" onClick={handleExport}>
            <Download className="size-4" /> Download Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-center items-center text-center">
          <div className="size-12 rounded-xl gradient-brand text-white grid place-items-center mb-3">
            <Tent className="size-6" />
          </div>
          <Badge
            variant="outline"
            className="mb-2 font-mono text-sm cursor-pointer hover:bg-secondary transition-colors"
            onClick={copyToClipboard}
          >
            {camp.campCode}
            {copiedCode ? <Check className="size-3 ml-2 text-success" /> : <Copy className="size-3 ml-2 opacity-70" />}
          </Badge>
          <Badge
            variant="outline"
            className={
              camp.status === "Active" ? "bg-success/10 text-success border-success/30"
                : camp.status === "Scheduled" ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground"
            }
          >
            {camp.status}
          </Badge>
          <div className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-2">
            <CalendarDays className="size-4" />
            {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <Stethoscope className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{staff.doctors.length}</div>
            <div className="text-sm text-muted-foreground">Doctors</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-accent/10 text-accent grid place-items-center">
            <Users className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{staff.registrationTeam.length}</div>
            <div className="text-sm text-muted-foreground">Registration Staff</div>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="size-10 rounded-xl bg-warning/10 text-warning-foreground grid place-items-center">
            <Pill className="size-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{staff.pharmacyTeam.length}</div>
            <div className="text-sm text-muted-foreground">Pharmacy Staff</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Total Patients</div>
          <div className="text-3xl font-bold">{patientSummary.totalPatients}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Male / Female</div>
          <div className="text-2xl font-bold">{patientSummary.maleCount} / {patientSummary.femaleCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Children (≤12)</div>
          <div className="text-2xl font-bold">{patientSummary.childrenCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-muted-foreground mb-1">Senior (>60)</div>
          <div className="text-2xl font-bold">{patientSummary.seniorCount}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="font-semibold text-lg">Patient Records</h2>
          <Input
            placeholder="Search patients..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Age/Gender</th>
                <th className="px-4 py-3 font-medium">Village</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium">{p.token || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.age} / {p.gender}</td>
                    <td className="px-4 py-3">{p.village}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={
                        p.status === "Completed" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning-foreground border-warning/30"
                      }>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <h2 className="font-semibold text-lg">Medicine Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
              <tr>
                <th className="px-4 py-3 font-medium">Medicine</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium text-right">Initial Stock</th>
                <th className="px-4 py-3 font-medium text-right">Dispensed</th>
                <th className="px-4 py-3 font-medium text-right">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.length > 0 ? (
                inventory.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-semibold">{inv.medicineName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.category}</td>
                    <td className="px-4 py-3 font-mono text-xs">{inv.batchNumber}</td>
                    <td className="px-4 py-3 text-right">{inv.campStock}</td>
                    <td className="px-4 py-3 text-right text-success">{inv.dispensed}</td>
                    <td className="px-4 py-3 text-right font-medium">{inv.remaining}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No inventory recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
