/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_accounts from "../admin/accounts.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_referrals from "../lib/referrals.js";
import type * as lib_validate from "../lib/validate.js";
import type * as referrals from "../referrals.js";
import type * as schema_referrals from "../schema/referrals.js";
import type * as schema_users from "../schema/users.js";
import type * as shared_referrals from "../shared/referrals.js";
import type * as shared_roles from "../shared/roles.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/accounts": typeof admin_accounts;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/referrals": typeof lib_referrals;
  "lib/validate": typeof lib_validate;
  referrals: typeof referrals;
  "schema/referrals": typeof schema_referrals;
  "schema/users": typeof schema_users;
  "shared/referrals": typeof shared_referrals;
  "shared/roles": typeof shared_roles;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
