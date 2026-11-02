import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function logAudit(
  ctx: MutationCtx,
  entry: {
    actorId: Id<"users"> | undefined;
    action: string;
    entityType: string;
    entityId: string;
    summary: string;
  },
): Promise<void> {
  await ctx.db.insert("auditLogs", { ...entry, at: new Date().toISOString() });
}
