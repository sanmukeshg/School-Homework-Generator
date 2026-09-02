/**
 * Who the data services are currently working for.
 *
 * The homework and settings services are called from pages that know nothing
 * about authentication, so rather than threading a uid through every call the
 * signed-in account is recorded here once, when auth state changes. Null means
 * signed out, and every service falls back to local-only behaviour.
 */
let activeUid: string | null = null

export function setActiveUid(uid: string | null): void {
  activeUid = uid
}

export function getActiveUid(): string | null {
  return activeUid
}
