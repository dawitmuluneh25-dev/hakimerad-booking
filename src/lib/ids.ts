/**
 * Record identifiers are UUID strings. The type parameter names the table the
 * id belongs to, so call sites stay readable without a backend-specific brand.
 */
export type Id<_Table extends string> = string;
