import { toast } from '@langgenius/dify-ui/toast'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { trackEvent } from '@/app/components/base/amplitude'
import { login, teachingLogin } from '@/service/common'
import { clearTeachingTokens, setTeachingTokens } from '@/service/teaching-auth'
import MailAndPasswordAuth from '../mail-and-password-auth'

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
let params = new URLSearchParams()
vi.mock('@/next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params,
}))
vi.mock('@/context/i18n', () => ({ useLocale: () => 'zh-Hans' }))
vi.mock('@/service/common', () => ({ login: vi.fn(), teachingLogin: vi.fn() }))
vi.mock('@/service/teaching-auth', () => ({ clearTeachingTokens: vi.fn(), setTeachingTokens: vi.fn() }))
vi.mock('@/app/components/base/amplitude', () => ({ trackEvent: vi.fn() }))

const props = { isInvite: false, isEmailSetup: true, allowRegistration: false }
const password = 'TestPassword123'
const getAccountInput = () => screen.getByLabelText('login.loginIdentifier')
const getPasswordInput = () => screen.getByLabelText('login.password')
const getSubmitButton = () => screen.getByRole('button', { name: 'login.signBtn' })

function enterCredentials(identifier: string, secret = password) {
  fireEvent.change(getAccountInput(), { target: { value: identifier } })
  fireEvent.change(getPasswordInput(), { target: { value: secret } })
}

describe('MailAndPasswordAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    params = new URLSearchParams()
    localStorage.clear()
    vi.mocked(login).mockResolvedValue({ result: 'success' })
  })

  // Real inputs and dify-ui buttons exercise browser-facing password login.
  describe('Password login', () => {
    it('should accept a phone number without browser email validation', () => {
      render(<MailAndPasswordAuth {...props} />)

      expect(getAccountInput()).toHaveAttribute('type', 'text')
      expect(getAccountInput()).toHaveAttribute('autocomplete', 'username')
      expect(getSubmitButton()).toBeDisabled()
    })

    it.each([
      [' 13800000000 ', '13800000000', 'phone_password'],
      [' Owner@Example.com ', 'Owner@Example.com', 'email_password'],
    ])('should sign in using %s', async (input, expected, method) => {
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials(input)

      fireEvent.click(getSubmitButton())

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/apps'))
      expect(login).toHaveBeenCalledWith({
        url: '/login',
        body: { email: expected, password: btoa(password), language: 'zh-Hans', remember_me: true },
      })
      expect(clearTeachingTokens).toHaveBeenCalledOnce()
      expect(trackEvent).toHaveBeenCalledWith('user_login_success', { method, is_invite: false })
    })

    it('should sign in when Enter is pressed in the password input', async () => {
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.keyDown(getPasswordInput(), { key: 'Enter' })

      await waitFor(() => expect(login).toHaveBeenCalledOnce())
    })

    it('should preserve the configured post-login redirect', async () => {
      params = new URLSearchParams('redirect_url=%2Fdatasets')
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.click(getSubmitButton())

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/datasets'))
    })

    it('should disable submission while the login request is pending', async () => {
      let finish: (() => void) | undefined
      vi.mocked(login).mockImplementation(() => new Promise((resolve) => {
        finish = () => resolve({ result: 'success' })
      }))
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.click(getSubmitButton())

      expect(getSubmitButton()).toBeDisabled()
      finish?.()
      await waitFor(() => expect(getSubmitButton()).toBeEnabled())
    })

    it('should reveal and hide the entered password', () => {
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.click(screen.getByRole('button', { name: '😝' }))
      expect(getPasswordInput()).toHaveAttribute('type', 'text')
      fireEvent.click(screen.getByRole('button', { name: '👀' }))
      expect(getPasswordInput()).toHaveAttribute('type', 'password')
    })
  })

  // Mail-only recovery stays available for email accounts, while phone users get an actionable hint.
  describe('Password recovery', () => {
    it('should direct phone users to the administrator', () => {
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      expect(screen.getByText('login.phonePasswordResetHint')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'login.forget' })).toHaveAttribute('aria-disabled', 'true')
    })

    it('should keep email password recovery enabled when email is configured', () => {
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('owner@example.com')

      expect(screen.queryByText('login.phonePasswordResetHint')).not.toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'login.forget' })).toHaveAttribute('aria-disabled', 'false')
    })

    it('should keep email recovery disabled when mail is not configured', () => {
      render(<MailAndPasswordAuth {...props} isEmailSetup={false} />)

      expect(screen.getByRole('link', { name: 'login.forget' })).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Validation and errors', () => {
    it.each(['admin', '12345678901', '1380000000', '138000000000'])('should reject invalid identifier %s', (identifier) => {
      const error = vi.spyOn(toast, 'error')
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials(identifier)

      fireEvent.click(getSubmitButton())

      expect(error).toHaveBeenCalledWith('login.error.accountInValid')
      expect(login).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('should reject a blank identifier when Enter is pressed', () => {
      const error = vi.spyOn(toast, 'error')
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials(' ')

      fireEvent.keyDown(getPasswordInput(), { key: 'Enter' })

      expect(error).toHaveBeenCalledWith('login.error.accountEmpty')
      expect(login).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('should reject a whitespace-only password', () => {
      const error = vi.spyOn(toast, 'error')
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000', ' ')

      fireEvent.click(getSubmitButton())

      expect(error).toHaveBeenCalledWith('login.error.passwordEmpty')
      expect(login).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('should show account-and-password errors for an authentication rejection', async () => {
      const error = vi.spyOn(toast, 'error')
      vi.mocked(login).mockRejectedValue({ code: 'authentication_failed' })
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.click(getSubmitButton())

      await waitFor(() => expect(error).toHaveBeenCalledWith('login.error.invalidAccountOrPassword'))
      expect(replace).not.toHaveBeenCalled()
      error.mockRestore()
    })

    it('should show a returned server failure without navigating', async () => {
      const error = vi.spyOn(toast, 'error')
      vi.mocked(login).mockResolvedValue({ result: 'fail', data: 'failed', code: 'failed', message: 'failed' })
      render(<MailAndPasswordAuth {...props} />)
      enterCredentials('13800000000')

      fireEvent.click(getSubmitButton())

      await waitFor(() => expect(error).toHaveBeenCalledWith('failed'))
      expect(replace).not.toHaveBeenCalled()
      error.mockRestore()
    })
  })

  // Preserve both legacy teaching links and one-time ticket login alongside the new manual phone flow.
  describe('Existing login links', () => {
    it('should retain invitation login and its destination', async () => {
      params = new URLSearchParams('email=invited%40example.com&invite_token=invite-123')
      render(<MailAndPasswordAuth {...props} isInvite />)

      await waitFor(() => expect(login).toHaveBeenCalledOnce())
      expect(screen.getByLabelText('login.email')).toBeDisabled()
      expect(login).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.objectContaining({ email: 'invited@example.com', invite_token: 'invite-123' }),
      }))
      await waitFor(() => expect(replace).toHaveBeenCalledWith(expect.stringContaining('/signin/invite-settings?')))
    })

    it('should preserve teaching ticket login', async () => {
      params = new URLSearchParams('teaching_ticket=ticket')
      vi.mocked(teachingLogin).mockResolvedValue({ result: 'success', data: { access_token: 'access', refresh_token: 'refresh' } })
      render(<MailAndPasswordAuth {...props} />)

      await waitFor(() => expect(replace).toHaveBeenCalledWith('/apps'))
      expect(teachingLogin).toHaveBeenCalledWith('ticket')
      expect(setTeachingTokens).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh', csrf_token: undefined })
      expect(login).not.toHaveBeenCalled()
    })

    it('should keep a failed teaching ticket on the login page', async () => {
      const error = vi.spyOn(toast, 'error')
      params = new URLSearchParams('teaching_ticket=ticket')
      vi.mocked(teachingLogin).mockResolvedValue({ result: 'success' })
      render(<MailAndPasswordAuth {...props} />)

      await waitFor(() => expect(error).toHaveBeenCalledWith('login.error.invalidEmailOrPassword'))
      expect(replace).not.toHaveBeenCalled()
      error.mockRestore()
    })
  })
})
