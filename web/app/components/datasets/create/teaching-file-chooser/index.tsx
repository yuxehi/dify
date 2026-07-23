'use client'

import type { CustomFile, FileItem } from '@/models/datasets'
import { Button } from '@langgenius/dify-ui/button'
import { cn } from '@langgenius/dify-ui/cn'
import { Dialog, DialogContent } from '@langgenius/dify-ui/dialog'
import { RiCheckboxCircleFill, RiFileList3Line } from '@remixicon/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DocumentFileIcon from '@/app/components/datasets/common/document-file-icon'
import { useAppContext } from '@/context/app-context'
import { fetchTeachingFileList } from '@/service/teaching-file-list'

type Props = {
  fileList: FileItem[]
  isShow: boolean
  loadAllFiles?: boolean
  onClose: () => void
  onFileListUpdate: (files: FileItem[]) => void
}

const TeachingFileChooser = ({ fileList, isShow, loadAllFiles = false, onClose, onFileListUpdate }: Props) => {
  const { t } = useTranslation()
  const { userProfile } = useAppContext()
  const [candidates, setCandidates] = useState<CustomFile[]>([])
  const [selected, setSelected] = useState<CustomFile[]>(() => fileList.map(item => item.file))
  const [isLoading, setIsLoading] = useState(() => isShow && (loadAllFiles || Boolean(userProfile.email)))

  useEffect(() => {
    if (!isShow || (!loadAllFiles && !userProfile.email))
      return

    // Platform files already exist in Dify storage/database. Converting their
    // metadata to File objects lets the official ingestion flow consume their
    // existing upload-file ids without uploading a duplicate copy.
    // Administrators receive the unfiltered file collection across teaching
    // tasks; students continue to receive only files bound to their account.
    fetchTeachingFileList(userProfile.email, loadAllFiles ? 'all' : 'self')
      .then(({ data = [] }) => {
        setCandidates(data.flatMap((item) => {
          if (!item.id || !item.name)
            return []
          const mimeType = item.mime_type || 'application/octet-stream'
          const file = new File([], item.name, { type: mimeType, lastModified: item.created_at || Date.now() }) as CustomFile
          // Do not Object.assign the whole response: native File fields such as
          // name and size are read-only and assigning them throws in browsers.
          Object.assign(file, {
            id: item.id,
            extension: item.extension,
            mime_type: mimeType,
            created_by: item.created_by,
            created_at: item.created_at,
            platform_size: item.size,
          })
          return [file]
        }))
      })
      .catch(() => setCandidates([]))
      .finally(() => setIsLoading(false))
  }, [isShow, loadAllFiles, userProfile.email])

  const toggle = (file: CustomFile) => {
    setSelected(current => current.some(item => item.id === file.id)
      ? current.filter(item => item.id !== file.id)
      : [...current, file])
  }

  const addSelected = () => {
    // fileID only identifies React list entries; file.id is the persistent
    // UploadFile id sent to Dify's dataset creation API.
    onFileListUpdate(selected.map(file => ({
      file,
      fileID: `teaching-${file.id}`,
      progress: 100,
    })))
    onClose()
  }

  return (
    <Dialog open={isShow} onOpenChange={open => !open && onClose()}>
      <DialogContent className="w-full max-w-[520px]! overflow-hidden! border-none p-0! text-left align-middle">
        <div className="border-b border-divider-subtle px-6 pt-6 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-components-icon-bg-blue-light-solid">
              <RiFileList3Line className="size-5 text-components-avatar-shape-fill-stop-100" aria-hidden="true" />
            </div>
            <div>
              <h2 className="system-xl-semibold text-text-primary">
                {t('stepOne.teachingSource.selectTitle', { ns: 'datasetCreation' })}
              </h2>
              <p className="mt-1 system-xs-regular text-text-tertiary">
                {t('stepOne.teachingSource.selectTip', { ns: 'datasetCreation' })}
              </p>
            </div>
          </div>
        </div>
        <div className="max-h-[360px] min-h-[220px] space-y-1.5 overflow-y-auto bg-background-default-subtle px-6 py-5">
          {isLoading && (
            <div className="flex h-[180px] items-center justify-center system-sm-regular text-text-tertiary">
              {t('stepOne.teachingSource.loading', { ns: 'datasetCreation' })}
            </div>
          )}
          {!isLoading && candidates.length === 0 && (
            <div className="flex h-[180px] flex-col items-center justify-center text-center">
              <RiFileList3Line className="mb-3 size-8 text-text-quaternary" aria-hidden="true" />
              <div className="system-sm-medium text-text-secondary">
                {t('stepOne.teachingSource.noAvailableFiles', { ns: 'datasetCreation' })}
              </div>
            </div>
          )}
          {!isLoading && candidates.map(file => (
            <button
              key={file.id}
              type="button"
              className={cn(
                'flex h-13 w-full items-center rounded-xl border border-components-panel-border-subtle bg-components-panel-bg px-3 text-left shadow-xs transition-colors hover:border-components-panel-border hover:bg-components-panel-on-panel-item-bg-hover',
                selected.some(item => item.id === file.id) && 'border-components-option-card-option-selected-border bg-state-accent-hover ring-[0.5px] ring-components-option-card-option-selected-border',
              )}
              onClick={() => toggle(file)}
            >
              <DocumentFileIcon className="mr-3 size-7 shrink-0" extension={file.extension} name={file.name} />
              <span className="min-w-0 flex-1 truncate system-sm-medium text-text-secondary">{file.name}</span>
              {selected.some(item => item.id === file.id) && (
                <RiCheckboxCircleFill className="ml-3 size-5 shrink-0 text-text-accent" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-divider-subtle px-6 py-4">
          <span className="system-sm-medium text-text-secondary">
            {t('stepOne.teachingSource.selectedCount', { ns: 'datasetCreation', count: selected.length })}
          </span>
          <div className="flex gap-2">
            <Button onClick={onClose}>{t('operation.cancel', { ns: 'common' })}</Button>
            <Button variant="primary" disabled={!selected.length} onClick={addSelected}>
              {t('operation.add', { ns: 'common' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TeachingFileChooser
