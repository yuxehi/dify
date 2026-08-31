import type { AppContextValue } from '@/context/app-context'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import StudentIdentity from '../student-identity'

vi.mock('@/context/app-context')

describe('StudentIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAppContext).mockReturnValue({
      userProfile: {
        name: 'Student Zhang',
        avatar_url: null,
      },
    } as unknown as AppContextValue)
  })

  it('should show the injected student account name', () => {
    render(<StudentIdentity />)

    expect(screen.getByRole('button', { name: 'Student Zhang' })).toHaveClass('rounded-[20px]', 'hover:bg-state-base-hover')
    expect(screen.getByText('Student Zhang')).toBeInTheDocument()
  })

  it('should only show the avatar on mobile like Dify 1.0.1', () => {
    render(<StudentIdentity isMobile />)

    expect(screen.getByRole('button', { name: 'Student Zhang' })).toBeInTheDocument()
    expect(screen.queryByText('Student Zhang')).not.toBeInTheDocument()
  })
})
