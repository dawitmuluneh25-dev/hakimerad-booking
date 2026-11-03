import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import AppPage from "@/components/app-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api, usePaginatedQuery } from "@/lib/api.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import RequireRole from "../-components/require-role.tsx";
import { formatWhen } from "../-components/record-cards.tsx";

export const Route = createFileRoute("/_app/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <AuditPage />
    </RequireRole>
  ),
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const [debounced] = useDebounce(search, 300);
  const { results, status, loadMore } = usePaginatedQuery(
    api.reports.auditLog,
    { search: debounced.trim() || undefined },
    { initialNumItems: 40 },
  );

  return (
    <AppPage
      title="Audit log"
      description="Every status change and sensitive action, newest first."
    >
      <div className="relative pb-6">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the summary or action"
          className="pl-9"
          aria-label="Search the audit log"
        />
      </div>

      {status === "LoadingFirstPage" ? (
        <Skeleton className="h-64 w-full" />
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries match.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Actor</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {results.map((entry) => (
                <tr key={entry._id} className="border-b last:border-0">
                  <td className="whitespace-nowrap p-3">
                    {formatWhen(entry.at)}
                  </td>
                  <td className="p-3">{entry.actor}</td>
                  <td className="p-3 font-mono text-xs">{entry.action}</td>
                  <td className="p-3">{entry.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === "CanLoadMore" ? (
        <div className="pt-4">
          <Button variant="secondary" onClick={() => loadMore(25)}>
            Load more
          </Button>
        </div>
      ) : null}
    </AppPage>
  );
}
