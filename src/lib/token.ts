import "server-only";
import { randomBytes } from "crypto";

// Unguessable, url-safe token for the public client action link.
export function newToken(): string {
  return randomBytes(12).toString("base64url");
}
