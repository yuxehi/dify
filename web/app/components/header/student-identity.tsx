'use client'
import { Avatar } from '@langgenius/dify-ui/avatar'
import { RiArrowDownSLine } from '@remixicon/react'
import { useAppContext } from '@/context/app-context'

/**
 * Read-only identity shown to teaching-platform students.
 *
 * Students must be able to confirm which account was injected by the teaching
 * platform, but exposing AccountDropdown would also restore settings and logout
 * actions that are intentionally hidden in the simplified student workspace.
 */
type StudentIdentityProps = {
  isMobile?: boolean
}

const StudentIdentity = ({ isMobile = false }: StudentIdentityProps) => {
  const { userProfile } = useAppContext()

  return (
    <button
      type="button"
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
          <RiArrowDownSLine className="ml-1 h-3 w-3 shrink-0 text-text-tertiary" />
        </>
      )}
    </button>
  )
}

export default StudentIdentity
