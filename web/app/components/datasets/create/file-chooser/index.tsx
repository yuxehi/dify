'use client'
import type { FC } from 'react'
import { useEffect } from 'react'
import { useMemo } from 'react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import TypeIcon from '../type-icon'
import Modal from '@/app/components/base/modal'
import type { CustomFile, FileItem, ResFileList } from '@/models/datasets'
import Button from '@/app/components/base/button'
import cn from '@/utils/classnames'
import DocumentFileIcon from '@/app/components/datasets/common/document-file-icon'
import SimplePieChart from '@/app/components/base/simple-pie-chart'
import { RiDeleteBinLine } from '@remixicon/react'
import { Theme } from '@/types/app'
import useTheme from '@/hooks/use-theme'
import { fetchFileList } from '@/service/file-list'
import { useAppContext } from '@/context/app-context'

export type ISelectDataSetProps = {
  fileList: FileItem[]
  isShow: boolean
  onClose: () => void
  onPreview: (file: CustomFile) => void
  onFileListUpdate?: (files: FileItem[]) => void
}

const SelectDataSet: FC<ISelectDataSetProps> = ({
  fileList,
  isShow,
  onClose,
  onPreview,
  onFileListUpdate,
}) => {
  const { t } = useTranslation()
  const [selected, setSelected] = React.useState<CustomFile[]>([])
  const [candidateFileList, setCandidateFileList] = React.useState<CustomFile[]>([])
  const canSelectMulti = true

  const listRef = useRef<HTMLDivElement>(null)
  const { userProfile: { email } } = useAppContext()

  useEffect(() => {
    (async () => {
      try {
        const { data = [] }: ResFileList = await fetchFileList(email)
        const fileList = data.map((item) => {
          const { name = '', mime_type, created_at } = item
          const blob = new Blob([], { type: mime_type })
          return {
            ...item,
            ...new File([blob], name, { type: mime_type, lastModified: created_at }),
          } as CustomFile
        })

        setCandidateFileList(fileList)
      }
      catch (e) {
        console.log(e)
        setCandidateFileList([])
      }
    })()
  }, [email])

  const toggleSelect = (dataSet: CustomFile) => {
    const isSelected = selected.some(item => item.id === dataSet.id)
    if (isSelected) {
      setSelected(selected.filter(item => item.id !== dataSet.id))
    }
    else {
      if (canSelectMulti)
        setSelected([...selected, dataSet])
      else
        setSelected([dataSet])
    }
  }

  const handleSelect = () => {
    const newList = selected.map((file) => {
      const { created_at } = file
      return { file, fileID: `file0-${created_at}`, progress: 100 }
    })
    onFileListUpdate?.(newList)
    onClose()
  }

  // utils
  const getFileType = (currentFile: CustomFile) => {
    if (!currentFile)
      return ''

    const arr = currentFile.name.split('.')
    return arr[arr.length - 1]
  }

  const getFileSize = (size: number) => {
    if (size / 1024 < 10)
      return `${(size / 1024).toFixed(2)}KB`

    return `${(size / 1024 / 1024).toFixed(2)}MB`
  }

  const removeFile = (fileID: string) => {
    const newSelected = selected.filter(({ created_at }) => `file0-${created_at}` !== fileID)
    const newList = newSelected.map((file) => {
      const { created_at } = file
      return { file, fileID: `file0-${created_at}`, progress: 100 }
    })
    setSelected(newSelected)
    onFileListUpdate?.(newList)
  }

  const { theme } = useTheme()
  const chartColor = useMemo(() => theme === Theme.dark ? '#5289ff' : '#296dff', [theme])

  return (
    <div className="mb-5 w-[640px]">
      <div className='space-y-1 max-w-[640px] cursor-default'>
        {fileList.map((fileItem, index) => (
          <div key={`${fileItem.fileID}-${index}`}
            onClick={() => fileItem.file?.id && onPreview(fileItem.file)}
            className={cn('flex items-center h-12 max-w-[640px] bg-components-panel-on-panel-item-bg text-xs leading-3 text-text-tertiary border border-components-panel-border rounded-lg shadow-xs')}>
            <div className="shrink-0 flex justify-center items-center w-12">
              <DocumentFileIcon
                className="shrink-0 size-6"
                name={fileItem.file.name}
                extension={getFileType(fileItem.file)}
              />
            </div>
            <div className="grow shrink flex flex-col gap-0.5">
              <div className='flex w-full'>
                <div className="text-sm leading-4 text-text-secondary w-0 grow truncate">{fileItem.file.name}</div>
              </div>
              <div className="w-full leading-3 truncate text-text-tertiary">
                <span className='uppercase'>{getFileType(fileItem.file)}</span>
                <span className='px-1 text-text-quaternary'>·</span>
                <span>{getFileSize(fileItem.file.size)}</span>
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-end gap-1 pr-3 w-16">
              {(fileItem.progress < 100 && fileItem.progress >= 0) && (
                <SimplePieChart percentage={fileItem.progress} stroke={chartColor} fill={chartColor}
                  animationDuration={0}/>
              )}
              <span className="flex justify-center items-center w-6 h-6 cursor-pointer" onClick={(e) => {
                e.stopPropagation()
                removeFile(fileItem.fileID)
              }}>
                <RiDeleteBinLine className='size-4 text-text-tertiary'/>
              </span>
            </div>
          </div>
        ))}
      </div>
      <Modal isShow={isShow} onClose={onClose} className='w-[400px]' title={t('datasetCreation.stepOne.uploader.browse')}>
        {candidateFileList && candidateFileList?.length > 0 && (
          <>
            <div ref={listRef} className='mt-7 space-y-1 max-h-[286px] overflow-y-auto'>
              {candidateFileList.map(item => (
                <div
                  key={item.id}
                  className={cn(
                    'flex justify-between items-center h-10 px-2 rounded-lg bg-components-panel-on-panel-item-bg border-components-panel-border-subtle border-[0.5px] shadow-xs cursor-pointer hover:border-components-panel-border hover:bg-components-panel-on-panel-item-bg-hover hover:shadow-sm',
                    selected.some(i => i.id === item.id) && 'border-[1.5px] border-components-option-card-option-selected-border bg-state-accent-hover shadow-xs hover:shadow-xs hover:border-components-option-card-option-selected-border hover:bg-state-accent-hover',
                  )}
                  onClick={() => toggleSelect(item)}>
                  <div className='mr-1 flex items-center overflow-hidden'>
                    <div className={cn('mr-2')}>
                      <TypeIcon type="upload_file" size='md'/>
                    </div>
                    <div
                      className={cn('max-w-[200px] text-[13px] font-medium text-text-secondary truncate')}>
                      {item.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div className='flex justify-between items-center mt-8'>
          <div className='text-sm  font-medium text-text-secondary'>
            {selected.length > 0 && `${selected.length} ${t('appDebug.feature.dataSet.selected')}`}
          </div>
          <div className='flex space-x-2'>
            <Button onClick={onClose}>{t('common.operation.cancel')}</Button>
            <Button variant='primary' onClick={handleSelect}>{t('common.operation.add')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
export default React.memo(SelectDataSet)
