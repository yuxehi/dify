'use client'

import type { CustomFile, FileItem } from '@/models/datasets'
import { Button } from '@langgenius/dify-ui/button'
import { RiDeleteBinLine, RiFolderOpenLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import DocumentFileIcon from '@/app/components/datasets/common/document-file-icon'

type Props = {
  files: FileItem[]
  onBrowse: () => void
  onFilesChange: (files: FileItem[]) => void
  onPreview: (file: CustomFile) => void
}

const StudentFileSource = ({ files, onBrowse, onFilesChange, onPreview }: Props) => {
  const { t } = useTranslation()

  return (
    <section className="mb-5 w-[640px]" aria-labelledby="teaching-file-source-title">
      <div className="mb-6">
        <div className="mb-2 system-2xs-medium-uppercase tracking-[0.08em] text-text-accent">
          {t('stepOne.teachingSource.eyebrow', { ns: 'datasetCreation' })}
        </div>
        <h1 id="teaching-file-source-title" className="title-2xl-semi-bold text-text-primary">
          {t('stepOne.teachingSource.title', { ns: 'datasetCreation' })}
        </h1>
        <p className="mt-2 max-w-[560px] system-sm-regular text-text-tertiary">
          {t('stepOne.teachingSource.description', { ns: 'datasetCreation' })}
        </p>
      </div>

      <div className="rounded-2xl border border-components-panel-border bg-components-panel-bg p-3 shadow-xs">
        <div className="flex min-h-[116px] items-center gap-4 rounded-xl border border-dashed border-components-option-card-option-border bg-background-default-subtle px-5 py-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-components-panel-border bg-components-panel-bg shadow-xs">
            <RiFolderOpenLine className="size-6 text-text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="system-md-semibold text-text-primary">
              {t('stepOne.teachingSource.selectTitle', { ns: 'datasetCreation' })}
            </div>
            <div className="mt-1 system-xs-regular text-text-tertiary">
              {t('stepOne.teachingSource.selectTip', { ns: 'datasetCreation' })}
            </div>
          </div>
          <Button variant="primary" className="shrink-0" onClick={onBrowse}>
            {t('stepOne.teachingSource.selectButton', { ns: 'datasetCreation' })}
          </Button>
        </div>

        <div className="px-1 pt-4 pb-1" aria-live="polite">
          <div className="mb-2 flex h-5 items-center justify-between px-1">
            <span className="system-xs-medium text-text-secondary">
              {t('stepOne.teachingSource.selectedFiles', { ns: 'datasetCreation' })}
            </span>
            <span className="system-xs-regular text-text-tertiary">
              {t('stepOne.teachingSource.selectedCount', { ns: 'datasetCreation', count: files.length })}
            </span>
          </div>

          {files.length === 0
            ? (
                <div className="flex h-14 items-center justify-center rounded-lg bg-background-default-subtle system-xs-regular text-text-quaternary">
                  {t('stepOne.teachingSource.empty', { ns: 'datasetCreation' })}
                </div>
              )
            : (
                <div className="space-y-1.5">
                  {files.map(fileItem => (
                    <div
                      key={fileItem.fileID}
                      className="group flex h-14 items-center rounded-xl border border-components-panel-border-subtle bg-components-panel-on-panel-item-bg shadow-xs transition-colors hover:border-components-panel-border hover:bg-components-panel-on-panel-item-bg-hover"
                    >
                      {/* Keep the selected-file row itself clickable so the
                          official preview panel can show the stored file. */}
                      <button
                        type="button"
                        aria-label={`${t('stepOne.filePreview', { ns: 'datasetCreation' })}: ${fileItem.file.name}`}
                        className="flex h-full min-w-0 flex-1 cursor-pointer items-center rounded-l-xl px-3 text-left focus-visible:ring-1 focus-visible:ring-components-input-border-active focus-visible:outline-hidden"
                        onClick={() => onPreview(fileItem.file)}
                      >
                        <DocumentFileIcon
                          className="mr-3 size-7 shrink-0"
                          extension={fileItem.file.extension}
                          name={fileItem.file.name}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate system-sm-medium text-text-secondary">{fileItem.file.name}</div>
                          <div className="mt-0.5 system-2xs-regular text-text-quaternary uppercase">
                            {fileItem.file.extension || fileItem.file.name.split('.').pop() || 'file'}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        aria-label={t('stepOne.teachingSource.removeFile', { ns: 'datasetCreation', name: fileItem.file.name })}
                        className="mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-quaternary transition-colors hover:bg-state-destructive-hover hover:text-text-destructive"
                        onClick={() => onFilesChange(files.filter(item => item.fileID !== fileItem.fileID))}
                      >
                        <RiDeleteBinLine className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
        </div>
      </div>
    </section>
  )
}

export default StudentFileSource
