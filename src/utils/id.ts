let counter = 0

/** Small, dependency-free unique id — good enough for local rows. */
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}
