import { defineSchema } from "convex/server";
import { referralDocumentsTable, referralsTable } from "./schema/referrals";
import {
  auditLogsTable,
  physicianProfilesTable,
  usersTable,
} from "./schema/users";

export default defineSchema({
  users: usersTable,
  physicianProfiles: physicianProfilesTable,
  auditLogs: auditLogsTable,
  referrals: referralsTable,
  referralDocuments: referralDocumentsTable,
});
