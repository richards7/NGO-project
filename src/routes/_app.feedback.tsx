import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell";
import { Star, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/feedback")({
  component: FeedbackPage,
});

function FeedbackPage() {
  const [stats, setStats] = useState<any>(null);
  const [allFeedback, setAllFeedback] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/analytics/feedback").then(r => setStats(r.data)).catch(() => {});
    apiRequest("/analytics/feedback/all").then(r => setAllFeedback(r.data?.feedback || [])).catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Patient Feedback" subtitle="View ratings and comments from patients after their camp visit." />
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 card-elevated text-center flex flex-col justify-center items-center">
          <div className="text-5xl font-bold">{stats?.avgRating || 0}</div>
          <div className="flex items-center gap-1 mt-2 text-warning">
            {[1,2,3,4,5].map(n => (
              <Star key={n} className={cn("size-5", n <= Math.round(stats?.avgRating || 0) ? "fill-warning" : "text-muted-foreground/30 fill-muted-foreground/30")} />
            ))}
          </div>
          <div className="text-sm text-muted-foreground mt-2">Average rating out of {stats?.total || 0} reviews</div>
        </Card>
        
        <Card className="p-6 card-elevated md:col-span-2">
          <h3 className="font-semibold mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            {[5,4,3,2,1].map(n => {
              const count = stats?.distribution?.[n] || 0;
              const total = stats?.total || 1;
              const pct = (count / total) * 100;
              return (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <div className="w-12 flex items-center gap-1">{n} <Star className="size-3 fill-muted-foreground text-muted-foreground" /></div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="w-10 text-right tabular-nums">{count}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <h3 className="font-semibold text-lg mb-4">Recent Feedback</h3>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allFeedback.map((f: any) => (
          <Card key={f.id} className="p-5 card-elevated">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1 text-warning">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className={cn("size-4", n <= f.rating ? "fill-warning" : "text-muted-foreground/30 fill-muted-foreground/30")} />
                ))}
              </div>
              <Badge variant="outline" className="text-xs">{new Date(f.createdAt).toLocaleDateString()}</Badge>
            </div>
            {f.comments && (
              <div className="mt-4 text-sm bg-muted/40 p-3 rounded-lg flex gap-2 items-start">
                <MessageSquare className="size-4 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground leading-relaxed">{f.comments}</span>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
              <div>
                <span className="font-medium">{f.patient?.name || "Unknown Patient"}</span>
                <span className="text-muted-foreground ml-2">Token: {f.patient?.token}</span>
              </div>
              <div className="text-muted-foreground font-mono">{f.camp?.campCode}</div>
            </div>
          </Card>
        ))}
        {allFeedback.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No feedback received yet.
          </div>
        )}
      </div>
    </div>
  );
}
