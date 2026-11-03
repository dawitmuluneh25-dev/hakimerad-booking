import { WifiOffIcon } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online.ts";

/** Shown on every page when the browser reports no connection. */
export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950"
    >
      <WifiOffIcon className="size-4" />
      You are offline. Nothing can be submitted until the connection returns.
    </div>
  );
}
