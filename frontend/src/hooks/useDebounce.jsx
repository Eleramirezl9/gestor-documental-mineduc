import { useState, useEffect } from 'react'

export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook for debouncing API calls
export function useApiDebounce(callback, delay = 300, deps = []) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    const timeoutId = setTimeout(async () => {
      if (!mounted) return

      try {
        setLoading(true)
        setError(null)
        await callback()
      } catch (err) {
        if (mounted) {
          setError(err)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }, delay)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [...deps, delay])

  return { loading, error }
}