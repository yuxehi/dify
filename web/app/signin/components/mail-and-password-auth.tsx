import type { ResponseError } from '@/service/fetch'
import { Button } from '@langgenius/dify-ui/button'
import { toast } from '@langgenius/dify-ui/toast'
import { noop } from 'es-toolkit/function'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { trackEvent } from '@/app/components/base/amplitude'
import Input from '@/app/components/base/input'
import { emailRegex } from '@/config'
import { useLocale } from '@/context/i18n'
import Link from '@/next/link'
import { useRouter, useSearchParams } from '@/next/navigation'
import { login, teachingLogin } from '@/service/common'
import { clearTeachingTokens, setTeachingTokens } from '@/service/teaching-auth'
import { encryptPassword } from '@/utils/encryption'
import { resolvePostLoginRedirect } from '../utils/post-login-redirect'

type MailAndPasswordAuthProps = {
  isInvite: boolean
  isEmailSetup: boolean
  allowRegistration: boolean
}

export default function MailAndPasswordAuth({ isInvite, isEmailSetup, allowRegistration: _allowRegistration }: MailAndPasswordAuthProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const emailFromLink = decodeURIComponent(searchParams.get('email') || '')
  const teachingTicket = decodeURIComponent(searchParams.get('teaching_ticket') || '')
  const [email, setEmail] = useState(emailFromLink)
  // Compatibility contract: the teaching platform enters with ?email=... and
  // all provisioned student accounts use the same password as the 1.0.1 build.
  const [password, setPassword] = useState(emailFromLink ? 'Ydt@12345' : '')
  const hasTriggeredTeachingLoginRef = useRef(false)

  const [isLoading, setIsLoading] = useState(false)
  const isPhoneAccount = /^1[3-9]\d{9}$/.test(email.trim())
  const canResetPassword = isEmailSetup && !isPhoneAccount

  const handleEmailPasswordLogin = useCallback(async () => {
    const identifier = email.trim()
    if (!identifier) {
      toast.error(t('error.accountEmpty', { ns: 'login' }))
      return
    }
    if (!emailRegex.test(identifier) && !/^1[3-9]\d{9}$/.test(identifier)) {
      toast.error(t('error.accountInValid', { ns: 'login' }))
      return
    }
    if (!password?.trim()) {
      toast.error(t('error.passwordEmpty', { ns: 'login' }))
      return
    }

    try {
      setIsLoading(true)
      // A direct administrator login in the same tab must not inherit a prior
      // student Bearer session, otherwise subsequent requests would omit cookies.
      clearTeachingTokens()
      const loginData: {
        email: string
        password: string
        language: string
        remember_me: boolean
        invite_token?: string
      } = {
        email: identifier,
        password: encryptPassword(password),
        language: locale,
        remember_me: true,
      }
      if (isInvite)
        loginData.invite_token = decodeURIComponent(searchParams.get('invite_token') as string)
      const res = await login({
        url: '/login',
        body: loginData,
      })
      if (res.result === 'success') {
        trackEvent('user_login_success', {
          method: /^1[3-9]\d{9}$/.test(identifier) ? 'phone_password' : 'email_password',
          is_invite: isInvite,
        })

        if (isInvite) {
          router.replace(`/signin/invite-settings?${searchParams.toString()}`)
        }
        else {
          const redirectUrl = resolvePostLoginRedirect(searchParams)
          router.replace(redirectUrl || '/apps')
        }
      }
      else {
        toast.error(res.data)
      }
    }
    catch (error) {
      if ((error as ResponseError).code === 'authentication_failed') {
        toast.error(t('error.invalidAccountOrPassword', { ns: 'login' }))
      }
    }
    finally {
      setIsLoading(false)
    }
  }, [email, isInvite, locale, password, router, searchParams, t])

  const handleTeachingTicketLogin = useCallback(async () => {
    if (!teachingTicket)
      return
    try {
      setIsLoading(true)
      const res = await teachingLogin(teachingTicket)
      if (res.result !== 'success' || !res.data?.access_token || !res.data.refresh_token)
        throw new Error('Invalid teaching login response')

      // Student iframe auth deliberately uses session-scoped Bearer tokens.
      // Administrator direct login remains on Dify's official HttpOnly cookies.
      setTeachingTokens({
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token,
        csrf_token: res.data.csrf_token,
      })
      trackEvent('user_login_success', {
        method: 'teaching_ticket',
        is_invite: false,
      })
      const redirectUrl = resolvePostLoginRedirect(searchParams)
      router.replace(redirectUrl || '/apps')
    }
    catch {
      toast.error(t('error.invalidEmailOrPassword', { ns: 'login' }))
    }
    finally {
      setIsLoading(false)
    }
  }, [router, searchParams, t, teachingTicket])

  useEffect(() => {
    // React Strict Mode may run effects twice in development. Guarding the call
    // avoids duplicate login attempts and accidental rate-limit increments.
    if ((!teachingTicket && !emailFromLink) || hasTriggeredTeachingLoginRef.current)
      return
    hasTriggeredTeachingLoginRef.current = true
    if (teachingTicket)
      handleTeachingTicketLogin()
    else
      handleEmailPasswordLogin()
  }, [emailFromLink, handleEmailPasswordLogin, handleTeachingTicketLogin, teachingTicket])

  return (
    <form onSubmit={noop}>
      <div className="mb-3">
        <label htmlFor="email" className="my-2 system-md-semibold text-text-secondary">
          {t(isInvite ? 'email' : 'loginIdentifier', { ns: 'login' })}
        </label>
        <div className="mt-1">
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isInvite}
            id="email"
            type="text"
            autoComplete="username"
            placeholder={t(isInvite ? 'emailPlaceholder' : 'loginIdentifierPlaceholder', { ns: 'login' }) || ''}
            tabIndex={1}
          />
        </div>
      </div>

      <div className="mb-3">
        <div className="my-2 flex items-center justify-between">
          <label htmlFor="password" className="system-md-semibold text-text-secondary">{t('password', { ns: 'login' })}</label>
          <Link
            href={`/reset-password?${searchParams.toString()}`}
            className={`system-xs-regular ${canResetPassword ? 'text-components-button-secondary-accent-text' : 'pointer-events-none text-components-button-secondary-accent-text-disabled'}`}
            tabIndex={canResetPassword ? 0 : -1}
            aria-disabled={!canResetPassword}
          >
            {t('forget', { ns: 'login' })}
          </Link>
        </div>
        <div className="relative mt-1">
          <Input
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')
                handleEmailPasswordLogin()
            }}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('passwordPlaceholder', { ns: 'login' }) || ''}
            tabIndex={2}
          />
          <div className="absolute inset-y-0 right-0 flex items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👀' : '😝'}
            </Button>
          </div>
        </div>
      </div>

      {isPhoneAccount && (
        <p className="mb-3 system-xs-regular text-text-tertiary">
          {t('phonePasswordResetHint', { ns: 'login' })}
        </p>
      )}

      <div className="mb-2">
        <Button
          tabIndex={2}
          variant="primary"
          onClick={handleEmailPasswordLogin}
          disabled={isLoading || !email.trim() || !password}
          className="w-full"
        >
          {t('signBtn', { ns: 'login' })}
        </Button>
      </div>
    </form>
  )
}
