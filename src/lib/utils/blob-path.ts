import { basename } from "node:path/posix";

/**
 * Reduces a client-supplied blob pathname to `${expectedPrefix}/${basename}`,
 * discarding any prefix or traversal segments the client sent. The upload
 * token would otherwise sign whatever path the client asks for, letting a
 * member with only one feature's upload rights write into another feature's
 * blob namespace.
 */
export function normaliseBlobPath(
  pathname: string,
  expectedPrefix: string,
): string {
  return `${expectedPrefix}/${basename(pathname)}`;
}
