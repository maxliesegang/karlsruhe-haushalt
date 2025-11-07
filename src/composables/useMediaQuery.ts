import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from 'vue'

type MediaQueryListWithLegacy = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void
}

export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false)
  let mediaQuery: MediaQueryListWithLegacy | null = null
  let cleanup: (() => void) | null = null

  const handleChange = (event: MediaQueryListEvent) => {
    matches.value = event.matches
  }

  const attach = () => {
    if (!mediaQuery) return
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange)
    }

    cleanup = () => {
      if (!mediaQuery) return
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(handleChange)
      }
      cleanup = null
    }
  }

  const setup = () => {
    if (typeof window === 'undefined') return
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
    attach()
  }

  onMounted(setup)
  onBeforeUnmount(() => {
    cleanup?.()
    mediaQuery = null
  })

  if (typeof window !== 'undefined') {
    mediaQuery = window.matchMedia(query)
    matches.value = mediaQuery.matches
  }

  return readonly(matches)
}
