import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BellIcon,
  MailIcon,
  MessageSquareIcon,
  RefreshCwIcon,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api, useMutation, usePaginatedQuery } from "@/lib/api.ts";
import { useMe } from "@/hooks/use-me.ts";
import { errorMessage } from "@/lib/errors.ts";
import { isStaffRole } from "@/shared/roles.ts";
import { formatWhen } from "./-components/record-cards.tsx";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications | HakimeRAD IR Booking" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const me = useMe();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { results, status, loadMore } = usePaginatedQuery(
    api.notifications.list,
    { unreadOnly },
    { initialNumItems: 30 },
  );
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const resend = useMutation(api.notifications.resend);
  const staff = isStaffRole(me?.role ?? undefined);

  return (
    <AppPage
      title="Notifications"
      description="Updates about your requests. Messages carry the reference only — no clinical detail."
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setUnreadOnly((value) => !value)}
          >
            {unreadOnly ? "Show all" : "Unread only"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await markAllRead({});
                toast.success("All notifications marked read.");
              } catch (error) {
                toast.error(
                  errorMessage(error, "Could not update notifications."),
                );
              }
            }}
          >
            Mark all read
          </Button>
        </div>
      }
    >
      {status === "LoadingFirstPage" ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <Empty className="rounded-xl border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing new</EmptyTitle>
            <EmptyDescription>
              Updates about your requests will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {results.map((item) => (
            <li
              key={item._id}
              className={
                item.readAt
                  ? "rounded-xl border bg-background p-4"
                  : "rounded-xl border border-primary/40 bg-primary/5 p-4"
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(item.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.link ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      render={<Link to={item.link as never} />}
                      nativeButton={false}
                    >
                      Open
                    </Button>
                  ) : null}
                  {!item.readAt ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await markRead({ notificationId: item._id });
                        } catch (error) {
                          toast.error(
                            errorMessage(error, "Could not mark it read."),
                          );
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>

              <ul className="flex flex-wrap gap-2 pt-3 text-xs">
                {item.deliveries.map((delivery) => (
                  <li
                    key={`${item._id}-${delivery.channel}`}
                    className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1"
                  >
                    {delivery.channel === "email" ? (
                      <MailIcon className="size-3" />
                    ) : delivery.channel === "in_app" ? (
                      <BellIcon className="size-3" />
                    ) : (
                      <MessageSquareIcon className="size-3" />
                    )}
                    <span className="capitalize">
                      {delivery.channel.replaceAll("_", " ")}
                    </span>
                    <span className="text-muted-foreground">
                      · {delivery.status}
                    </span>
                    {staff && delivery.status !== "sent" ? (
                      <button
                        type="button"
                        className="ml-1 cursor-pointer text-primary hover:underline"
                        onClick={async () => {
                          try {
                            await resend({ deliveryId: delivery._id });
                            toast.success("Delivery retried.");
                          } catch (error) {
                            toast.error(
                              errorMessage(error, "Could not resend."),
                            );
                          }
                        }}
                      >
                        <RefreshCwIcon className="size-3" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
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
