import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api, useMutation, usePaginatedQuery } from "@/lib/api.ts";
import { SearchIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import AppPage from "@/components/app-page.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { Id } from "@/lib/ids.ts";
import { ROLES, ROLE_LABELS, type Role } from "@/shared/roles.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useMe } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import RequireRole from "../-components/require-role.tsx";

export const Route = createFileRoute("/_app/admin/users")({
  head: () => ({ meta: [{ title: "Users and roles | HakimeRAD IR Booking" }] }),
  component: () => (
    <RequireRole roles={["admin"]}>
      <UsersPage />
    </RequireRole>
  ),
});

type RoleFilter = Role | "all" | "unassigned";

const FILTER_ITEMS: Record<RoleFilter, string> = {
  all: "All roles",
  unassigned: "No role yet",
  ...ROLE_LABELS,
};
const ROLE_ITEMS: Record<Role, string> = ROLE_LABELS;

function UsersPage() {
  const me = useMe();
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.accounts.listUsers,
    {
      role: filter === "all" ? undefined : filter,
      search: debouncedSearch.trim() || undefined,
    },
    { initialNumItems: 30 },
  );

  return (
    <AppPage
      title="Users and roles"
      description="Assign staff roles. Patients and physicians choose their own account type at sign-up."
    >
      <div className="flex flex-col gap-3 pb-6 sm:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email"
            className="pl-9"
            aria-label="Search by email"
          />
        </div>
        <Select
          items={FILTER_ITEMS}
          value={filter}
          onValueChange={(value) => {
            if (value) setFilter(value);
          }}
        >
          <SelectTrigger
            className="w-full cursor-pointer sm:w-56"
            aria-label="Filter by role"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FILTER_ITEMS) as RoleFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {FILTER_ITEMS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : status === "Exhausted" && results.length === 0 ? (
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>
              Try a different search or role filter.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-background">
          {results.map((u) => (
            <UserRow key={u._id} user={u} isSelf={u._id === me?.id} />
          ))}
          {status === "CanLoadMore" ? (
            <div className="p-3">
              <Button variant="secondary" onClick={() => loadMore(30)}>
                Load more
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </AppPage>
  );
}

function UserRow({
  user,
  isSelf,
}: {
  user: {
    _id: Id<"users">;
    email: string;
    fullName: string;
    role: Role | null;
  };
  isSelf: boolean;
}) {
  const setRole = useMutation(api.admin.accounts.setUserRole);

  const onChange = async (role: Role) => {
    try {
      await setRole({ userId: user._id, role });
      toast.success(`Role set to ${ROLE_LABELS[role]}`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not change the role."));
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {user.fullName || "Name not set"}
          {isSelf ? (
            <span className="pl-2 text-xs text-muted-foreground">(you)</span>
          ) : null}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {user.email || "No email"}
        </p>
      </div>
      <Select
        items={ROLE_ITEMS}
        value={user.role}
        onValueChange={(value) => {
          if (value) void onChange(value);
        }}
      >
        <SelectTrigger
          className="w-full cursor-pointer sm:w-60"
          aria-label={`Role for ${user.email}`}
        >
          <SelectValue placeholder="No role yet" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
