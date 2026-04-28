import { useEffect } from 'react'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGeoWatch } from '@/lib/useGeoWatch'

function TestHarness({ enabled = true, minIntervalMs = 0 }) {
  const { pos, error } = useGeoWatch({
    enabled,
    minIntervalMs,
    highAccuracy: true,
    maxAgeMs: 0,
    timeoutMs: 5000,
  })

  useEffect(() => {
    // expose for debugging if needed
  }, [pos, error])

  return (
    <div>
      <div data-testid="lat">{pos?.lat ?? ''}</div>
      <div data-testid="lng">{pos?.lng ?? ''}</div>
      <div data-testid="err">{error ? String(error.message || error) : ''}</div>
    </div>
  )
}

describe('useGeoWatch', () => {
  let watchOk
  let watchErr
  let clearWatch

  beforeEach(() => {
    watchOk = null
    watchErr = null
    clearWatch = vi.fn()

    const watchPosition = vi.fn((ok, err) => {
      watchOk = ok
      watchErr = err
      return 123
    })

    Object.defineProperty(window.navigator, 'geolocation', {
      value: { watchPosition, clearWatch },
      configurable: true,
    })
  })

  it('subscribes and updates position on valid GPS callbacks', () => {
    render(<TestHarness enabled minIntervalMs={0} />)

    expect(screen.getByTestId('lat')).toHaveTextContent('')
    expect(screen.getByTestId('lng')).toHaveTextContent('')

    act(() => {
      watchOk?.({
        coords: { latitude: 30.1, longitude: 31.2, heading: 90, accuracy: 5 },
        timestamp: 111,
      })
    })

    expect(screen.getByTestId('lat')).toHaveTextContent('30.1')
    expect(screen.getByTestId('lng')).toHaveTextContent('31.2')
    expect(screen.getByTestId('err')).toHaveTextContent('')
  })

  it('reports geolocation errors and clears them after a successful update', () => {
    render(<TestHarness enabled minIntervalMs={0} />)

    act(() => {
      watchErr?.(new Error('Denied'))
    })
    expect(screen.getByTestId('err')).toHaveTextContent('Denied')

    act(() => {
      watchOk?.({
        coords: { latitude: 10, longitude: 20, heading: null, accuracy: 12 },
        timestamp: 222,
      })
    })
    expect(screen.getByTestId('err')).toHaveTextContent('')
    expect(screen.getByTestId('lat')).toHaveTextContent('10')
    expect(screen.getByTestId('lng')).toHaveTextContent('20')
  })

  it('cleans up watchPosition on unmount', () => {
    const { unmount } = render(<TestHarness enabled minIntervalMs={0} />)
    unmount()
    expect(clearWatch).toHaveBeenCalledWith(123)
  })
})

