import { useEffect, type DependencyList } from 'react'

/** Runs `effect` once the deps have been quiet for `delay` ms. */
export function useDebouncedEffect(effect: () => void, deps: DependencyList, delay = 400): void {
  useEffect(() => {
    const handle = window.setTimeout(effect, delay)
    return () => window.clearTimeout(handle)
  }, [...deps, delay])
}
