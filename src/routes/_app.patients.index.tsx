import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app-shell";
import { QrCode, Scan, Search, UserPlus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { usePatients } from "@/hooks/use-patients";

export const Route = createFileRoute("/_app/patients/")({
  component: PatientsPage,
});

function PatientsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((window as any).__patientSearchTimer);
    (window as any).__patientSearchTimer = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  // Read from local SQLite — works offline!
  const { data: patients, isLoading } = usePatients(debouncedSearch || undefined);
  const total = patients?.length ?? 0;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Patients"
        subtitle={isAdmin ? "View patient records and history." : "Register new patients or look up existing household health cards."}
        actions={
          !isAdmin ? (
            <>
              <Button variant="outline" className="gap-2 rounded-xl"><Scan className="size-4" /> Scan Card</Button>
              <Button asChild className="gap-2 rounded-xl">
                <Link to="/patients/new"><UserPlus className="size-4" /> New Patient</Link>
              </Button>
            </>
          ) : undefined
        }
      />

      {!isAdmin && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: UserPlus, label: "Register New Patient", desc: "First-time visitor · generate token", to: "/patients/new", tone: "bg-primary/10 text-primary" },
            { icon: Search, label: "Existing Patient", desc: "Search by name, phone or ID", to: "/patients", tone: "bg-accent/15 text-accent" },
            { icon: QrCode, label: "Household Health Card", desc: "Scan family QR code", to: "/patients", tone: "bg-success/15 text-success" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.label} to={s.to}>
                <Card className="p-5 card-elevated hover:border-primary/40 transition h-full">
                  <div className={`size-11 rounded-2xl grid place-items-center ${s.tone}`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold mt-4">{s.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Card className="card-elevated">
        <div className="p-4 flex items-center gap-3 border-b">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search patients by name, ID, phone…" 
              className="pl-9 h-10" 
            />
          </div>
          <Badge variant="outline" className="ml-auto">{total} patients found</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="hidden md:table-cell">Village</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(patients ?? []).map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {p.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.id.substring(0,8)} · {p.age}y · {p.gender}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{p.token}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.village}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.phone}</TableCell>
                  <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                        p.queuePriority === "highest" ? "bg-destructive/10 text-destructive border-destructive/30"
                        : p.status === "Registered" ? "bg-primary/10 text-primary border-primary/30"
                        : p.status === "Completed" ? "bg-success/10 text-success border-success/30"
                        : "bg-muted text-muted-foreground"
                      }>
                      {p.queuePriority === "highest" ? "Emergency" : p.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/patients/$id", params: { id: p.id } })}>
                      View
                    </Button>
                    {!isAdmin && p.status === "Registered" && (
                      <Button asChild variant="outline" size="sm" className="ml-2">
                        <Link to="/vitals" search={{ patientId: p.id }}>Add Vitals</Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!patients || patients.length === 0) && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No patients found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
