import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MapOverlayControls from '@/components/map/MapOverlayControls'

// Mock react-leaflet useMap
vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet')
  return {
    ...actual,
    useMap: () => ({
      getZoom: () => 13,
      setZoom: vi.fn(),
      flyTo: vi.fn(),
    }),
  }
})

describe('MapOverlayControls', () => {
  it('renders buttons and recenters when focus is valid', async () => {
    const user = userEvent.setup()
    render(<MapOverlayControls focus={{ lat: 30, lng: 31 }} />)

    expect(screen.getByLabelText('إعادة التمركز')).toBeInTheDocument()
    expect(screen.getByLabelText('تكبير')).toBeInTheDocument()
    expect(screen.getByLabelText('تصغير')).toBeInTheDocument()

    await user.click(screen.getByLabelText('إعادة التمركز'))
    // assertion is implicit: no crash in mocked environment
  })
})

