import { useState, useEffect, useRef } from 'react'

export const useCache = (key, ttl = 5 * 60 * 1000) => {
  const cache = useRef(new Map())

  const get = (cacheKey) => {
    const item = cache.current.get(`${key}_${cacheKey}`)
    if (item && Date.now() - item.timestamp < ttl) {
      return item.data
    }
    return null
  }

  const set = (cacheKey, data) => {
    cache.current.set(`${key}_${cacheKey}`, {
      data,
      timestamp: Date.now()
    })
  }

  const clear = (cacheKey) => {
    if (cacheKey) {
      cache.current.delete(`${key}_${cacheKey}`)
    } else {
      cache.current.clear()
    }
  }

  return { get, set, clear }
}

export const useApiCache = (apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const { ttl = 5 * 60 * 1000, fallback = null } = options
  const cache = useCache('api', ttl)
  const cacheKey = JSON.stringify(dependencies)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verificar caché primero
        const cachedData = cache.get(cacheKey)
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return
        }

        setLoading(true)
        const result = await apiCall()

        // Guardar en caché
        cache.set(cacheKey, result)
        setData(result)
        setError(null)
      } catch (err) {
        setError(err)
        if (fallback !== null) {
          setData(fallback)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, dependencies)

  const invalidate = () => {
    cache.clear(cacheKey)
  }

  return { data, loading, error, invalidate }
}