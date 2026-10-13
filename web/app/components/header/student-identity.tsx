'use client'
import { Avatar } from '@langgenius/dify-ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@langgenius/dify-ui/dropdown-menu'
import { useTranslation } from 'react-i18next'
import { resetUser } from '@/app/components/base/amplitude/utils'
import { useAppContext } from '@/context/app-context'
import { useRouter } from '@/next/navigation'
import { useLogout } from '@/service/use-common'
import { MenuItemContent } from './account-dropdown/menu-item-content'

/**
 * Student account menu keeps the simplified workspace while allowing logout.
 */
type StudentIdentityProps = {
  isMobile?: boolean
}

const StudentIdentity = ({ isMobile = false }: StudentIdentityProps) => {
  const { userProfile } = useAppContext()
  const { t } = useTranslation()
  const router = useRouter()
  const { mutateAsync: logout, isPending } = useLogout()
  const handleLogout = async () => {
    try {
      await logout()
      resetUser()
      localStorage.removeItem('setup_status')
      localStorage.removeItem('education-reverify-prev-expire-at')
      localStorage.removeItem('education-reverify-has-noticed')
      localStorage.removeItem('education-expired-has-noticed')
      router.push('/signin')
    }
    catch {
      // The request layer displays the error; retain the current session.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex max-w-[200px] min-w-0 items-center rounded-[20px] py-1 pr-2.5 pl-1 text-sm text-text-secondary hover:bg-state-base-hover"
        title={userProfile.name}
        aria-label={userProfile.name}
      >
        <Avatar
          avatar={userProfile.avatar_url}
          name={userProfile.name}
          size="lg"
          className={isMobile ? 'mr-0' : 'mr-2'}
        />
        {!isMobile && (
          <>
            <span className="truncate">{userProfile.name}</span>
            <span aria-hidden className="ml-1 i-ri-arrow-down-s-line h-3 w-3 shrink-0 text-text-tertiary" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={6} popupClassName="w-40">
        <DropdownMenuItem disabled={isPending} onClick={() => { void handleLogout() }}>
          <MenuItemContent iconClassName="i-ri-logout-box-r-line" label={t('userProfile.logout', { ns: 'common' })} />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default StudentIdentity
