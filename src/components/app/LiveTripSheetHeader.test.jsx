import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LiveTripSheetHeader from '@/components/app/LiveTripSheetHeader'

describe('LiveTripSheetHeader', () => {
  it('renders status text and back link', () => {
    render(
      <MemoryRouter>
        <LiveTripSheetHeader backTo="/app/trips" statusText="قيد الانتظار" />
      </MemoryRouter>,
    )

    expect(screen.getByText('قيد الانتظار')).toBeInTheDocument()
    expect(screen.getByLabelText('رجوع')).toHaveAttribute('href', '/app/trips')
  })

  it('supports compact variant', () => {
    render(
      <MemoryRouter>
        <LiveTripSheetHeader backTo="/x" statusText="مكتملة" compact />
      </MemoryRouter>,
    )
    expect(screen.getByText('مكتملة')).toBeInTheDocument()
  })
})

