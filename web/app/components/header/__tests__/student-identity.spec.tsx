import type { AppContextValue } from '@/context/app-context'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useAppContext } from '@/context/app-context'
import StudentIdentity from '../student-identity'

vi.mock('@/context/app-context')
const { logout, push } = vi.hoisted(() => ({ logout: vi.fn(), push: vi.fn() }))
vi.mock('@/service/use-common', () => ({ useLogout: () => ({ mutateAsync: logout, isPending: false }) }))
vi.mock('@/next/navigation', () => ({ useRouter: () => ({ push }) }))

describe('StudentIdentity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    logout.mockResolvedValue({})
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

  it.each([false, true])('should offer only logout when the avatar is clicked (mobile: %s)', async (isMobile) => {
    render(<StudentIdentity isMobile={isMobile} />)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Student Zhang' }))
    expect(await screen.findByRole('menuitem', { name: /userProfile.logout/ })).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(1)
  })

  it('should clear account state and return to signin after logout succeeds', async () => {
    localStorage.setItem('setup_status', 'finished')
    render(<StudentIdentity />)
    fireEvent.click(screen.getByRole('button', { name: 'Student Zhang' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /userProfile.logout/ }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/signin'))
    expect(logout).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('setup_status')).toBeNull()
  })

  it('should retain account state when logout fails', async () => {
    logout.mockRejectedValue(new Error('offline'))
    localStorage.setItem('setup_status', 'finished')
    render(<StudentIdentity />)
    fireEvent.click(screen.getByRole('button', { name: 'Student Zhang' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /userProfile.logout/ }))
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(localStorage.getItem('setup_status')).toBe('finished')
  })
})
