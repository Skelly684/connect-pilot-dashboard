import React from "react";
import { fetchLeadActivity } from "@/lib/apiFetch";

type Props = { leadId: string };

export function Activity({ leadId }: Props) {
  const [state, setState] = React.useState<{
    loading: boolean;
    error: string | null;
    calls: any[];
    emails: any[];
  }>({ loading: true, error: null, calls: [], emails: [] });

  React.useEffect(() => {
    let cancelled = false;
    setState(s => ({ ...s, loading: true, error: null }));
    fetchLeadActivity(leadId)
      .then((data) => {
        if (cancelled) return;
        setState({ loading: false, error: null, calls: data.calls, emails: data.emails });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, error: err?.message ?? "Failed to load activity", calls: [], emails: [] });
      });
    return () => { cancelled = true; };
  }, [leadId]);

  if (state.loading) return <div className="text-muted-foreground">Loading activity…</div>;
  if (state.error) return <div className="text-muted-foreground">Unable to load recent activity</div>;

  const rows: { kind: "email" | "call" | "reply"; when: string; title: string; sub?: string; body?: string }[] = [];

  // Email events (both sent & replies) - deduplicate all entries
  const emailSeenKeys = new Set<string>();
  
  for (const e of state.emails) {
    const when = e.created_at || e.updated_at || e.inserted_at || "";
    if ((e.status || "").toLowerCase() === "reply") {
      // Parse sender from notes (format: "from=email@domain.com ...")
      const notes = e.notes || "";
      const fromMatch = notes.match(/from=([^\s]+)/);
      const sender = fromMatch ? fromMatch[1] : "";
      
      // Extract snippet from notes (format: "...snippet=content...")
      const snippetMatch = notes.match(/snippet=(.+?)(?:\s|$)/);
      const snippet = snippetMatch ? snippetMatch[1] : "";
      
      const subject = (e.subject || "").trim();
      const body = e.body || snippet || "";
      
      // Deduplicate replies by subject + sender
      const dedupeKey = `reply_${subject}_${sender || e.to_email || 'unknown'}`;
      if (emailSeenKeys.has(dedupeKey)) {
        continue;
      }
      emailSeenKeys.add(dedupeKey);
      
      rows.push({
        kind: "reply",
        when,
        title: `Email reply: ${subject || "(no subject)"}`,
        sub: sender ? `from ${sender}` : (e.to_email || ""),
        body: body
      });
    } else {
      const subject = e.subject || "";
      const title = subject ? `Email sent: ${subject}` : "Email sent";
      
      // Deduplicate sent emails by subject + recipient
      const dedupeKey = `sent_${subject}_${e.to_email || 'unknown'}`;
      if (emailSeenKeys.has(dedupeKey)) {
        continue;
      }
      emailSeenKeys.add(dedupeKey);
      
      rows.push({
        kind: "email",
        when,
        title,
        sub: e.to_email || ""
      });
    }
  }

  // Call events - consolidate into single entry with all call content
  const callNotes = state.calls
    .filter(c => c.notes && c.notes.trim())
    .map(c => c.notes.trim())
    .join('\n\n');
  
  if (callNotes) {
    const latestCall = state.calls.reduce((latest, current) => {
      const currentTime = current.created_at || current.started_at || "";
      const latestTime = latest.created_at || latest.started_at || "";
      return currentTime > latestTime ? current : latest;
    });
    
    rows.push({
      kind: "call",
      when: latestCall.created_at || latestCall.started_at || "",
      title: "Call logs",
      body: callNotes
    });
  }

  // Sort newest first
  rows.sort((a, b) => (b.when || "").localeCompare(a.when || ""));

  if (rows.length === 0) return <div className="text-muted-foreground">No recent activity yet.</div>;

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-lg flex-shrink-0 mt-0.5">
            {r.kind === "reply" ? "↩️" : r.kind === "email" ? "✉️" : r.title === "Note added" ? "📝" : "📞"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{r.title}</div>
            {r.sub && (
              <div className="text-sm text-muted-foreground mt-1 break-words">
                {r.sub}
              </div>
            )}
            {r.body && (
              <div className="text-sm text-foreground/80 mt-2 break-words line-clamp-3">
                {r.body}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {new Date(r.when).toLocaleString?.() || r.when}
          </div>
        </div>
      ))}
    </div>
  );
}