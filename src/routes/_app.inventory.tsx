import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app-shell";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CalendarClock, Package, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMedicines } from "@/hooks/use-medicines";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

function InventoryPage() {
  const { session } = useAuth();
  const isAdmin = session?.role === "admin";
  const [q, setQ] = useState("");
  const { data: medicinesList, isLoading } = useMedicines();

  // Client-side search since SQLite is local
  const medicines = (medicinesList ?? []).filter((m: any) => 
    !q || 
    m.name.toLowerCase().includes(q.toLowerCase()) || 
    (m.category_name && m.category_name.toLowerCase().includes(q.toLowerCase()))
  );

  const lowStockCount = medicines.filter((m: any) => m.stock <= m.alert_level).length;
  
  // Calculate expiring (within 90 days)
  const expiringCount = medicines.filter((m: any) => {
    const expiry = new Date(m.expiry_date);
    const in90Days = new Date();
    in90Days.setDate(in90Days.getDate() + 90);
    return expiry < in90Days;
  }).length;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inventory"
        subtitle="Track medicines, batches and expiries in real time."
        actions={
          isAdmin || session?.role === "pharmacy" ? (
            <Button className="gap-2 rounded-xl"><Plus className="size-4" /> Add Medicine</Button>
          ) : undefined
        }
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 card-elevated">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center"><Package className="size-5" /></div>
            <div><div className="text-2xl font-bold">{medicines.length}</div><div className="text-xs text-muted-foreground">Medicine SKUs</div></div>
          </div>
        </Card>
        <Card className="p-5 card-elevated bg-destructive/5 border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-destructive/15 text-destructive grid place-items-center"><AlertTriangle className="size-5" /></div>
            <div><div className="text-2xl font-bold text-destructive">{lowStockCount}</div><div className="text-xs text-muted-foreground">Low stock alerts</div></div>
          </div>
        </Card>
        <Card className="p-5 card-elevated bg-warning/5 border-warning/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-warning/20 text-warning-foreground grid place-items-center"><CalendarClock className="size-5" /></div>
            <div><div className="text-2xl font-bold">{expiringCount}</div><div className="text-xs text-muted-foreground">Expiring soon (90d)</div></div>
          </div>
        </Card>
      </div>

      <Card className="card-elevated">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search medicines by name or category…" className="pl-9 h-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((m: any) => {
                const isLowStock = m.stock <= m.alert_level;
                const expiry = new Date(m.expiry_date);
                const in90Days = new Date();
                in90Days.setDate(in90Days.getDate() + 90);
                const isExpiring = expiry < in90Days;

                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.id.substring(0,8)}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{m.category_name || "Medicine"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold tabular-nums ${isLowStock ? "text-destructive" : ""}`}>{m.stock}</span>
                        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden hidden md:block">
                          <div className={`h-full rounded-full ${isLowStock ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, (m.stock / 2100) * 100)}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.batch_number}</TableCell>
                    <TableCell className="text-sm">{new Date(m.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {isLowStock && <Badge className="bg-destructive/10 text-destructive border-destructive/30 mr-1" variant="outline">Low stock</Badge>}
                      {isExpiring && <Badge className="bg-warning/10 text-warning-foreground border-warning/30" variant="outline">Expiring</Badge>}
                      {!isLowStock && !isExpiring && <Badge variant="outline" className="bg-success/10 text-success border-success/30">Healthy</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {medicines.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No medicines found.
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
