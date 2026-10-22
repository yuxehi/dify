'use client'
import {
  RiAddLine,
  RiFunctionAddLine,
} from '@remixicon/react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConnectionMod } from '@/app/components/base/icons/src/vender/solid/development'
import { useAppContext } from '@/context/app-context'
import Link from '@/next/link'
import Option from './option'

const CreateAppCard = () => {
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()

  if (!isCurrentWorkspaceManager) {
    return (
      // Preserve the teaching edition's Dify 1.0.1 card interaction: the card
      // itself is the action, with a dashed icon tile and supporting copy.
      <div className="flex h-[190px] flex-col rounded-xl border-[0.5px] border-components-panel-border bg-background-default-dimmed transition-all duration-200 ease-in-out">
        <Link className="group flex grow cursor-pointer items-start p-4" href="/datasets/create">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-divider-regular bg-background-default-lighter p-2 group-hover:border-solid group-hover:border-effects-highlight group-hover:bg-background-default-dodge">
              <RiAddLine className="h-4 w-4 text-text-tertiary group-hover:text-text-accent" />
            </div>
            <div className="system-md-semibold text-text-secondary group-hover:text-text-accent">{t('createDataset', { ns: 'dataset' })}</div>
          </div>
        </Link>
        <div className="p-4 pt-0 system-xs-regular text-text-tertiary">{t('createDatasetIntro', { ns: 'dataset' })}</div>
      </div>
    )
  }

  return (
    <div className="flex h-[190px] flex-col gap-y-0.5 rounded-xl bg-background-default-dimmed">
      <div className="flex grow flex-col items-center justify-center p-2">
        <Option
          href="/datasets/create"
          Icon={RiAddLine}
          text={t('createDataset', { ns: 'dataset' })}
        />
        {isCurrentWorkspaceManager && (
          <Option
            href="/datasets/create-from-pipeline"
            Icon={RiFunctionAddLine}
            text={t('createFromPipeline', { ns: 'dataset' })}
          />
        )}
      </div>
      {isCurrentWorkspaceManager && (
        <div className="border-t-[0.5px] border-divider-subtle p-2">
          <Option
            href="/datasets/connect"
            Icon={ApiConnectionMod}
            text={t('connectDataset', { ns: 'dataset' })}
          />
        </div>
      )}
    </div>
  )
}

CreateAppCard.displayName = 'CreateAppCard'

export default CreateAppCard
