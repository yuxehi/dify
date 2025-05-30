'use client'
import type { FC } from 'react'
import { useMemo } from 'react'
import React, { useRef, useState } from 'react'
import { useGetState, useInfiniteScroll } from 'ahooks'
import { useTranslation } from 'react-i18next'
import TypeIcon from '../type-icon'
import Modal from '@/app/components/base/modal'
import type { CustomFile as File, FileItem, FileSet } from '@/models/datasets'
import Button from '@/app/components/base/button'
import Loading from '@/app/components/base/loading'
import { useKnowledge } from '@/hooks/use-knowledge'
import cn from '@/utils/classnames'
import DocumentFileIcon from '@/app/components/datasets/common/document-file-icon'
import SimplePieChart from '@/app/components/base/simple-pie-chart'
import { RiDeleteBinLine } from '@remixicon/react'
import { Theme } from '@/types/app'
import useTheme from '@/hooks/use-theme'

export type ISelectDataSetProps = {
  fileList: FileItem[]
  isShow: boolean
  onClose: () => void
  onSelect: (files: FileItem[]) => void
  onPreview: (file: File) => void
  selectedFiles: FileItem[]
}

const SelectDataSet: FC<ISelectDataSetProps> = ({
  fileList,
  isShow,
  onClose,
  onPreview,
  onSelect,
  selectedFiles,
}) => {
  const { t } = useTranslation()
  const [selected, setSelected] = React.useState<FileSet[]>([])
  const [loaded, setLoaded] = React.useState(false)
  const [datasets, setDataSets] = React.useState<FileSet[] | null>(null)
  const hasNoData = !datasets || datasets?.length === 0
  const canSelectMulti = true

  const listRef = useRef<HTMLDivElement>(null)
  const [page, setPage, getPage] = useGetState(1)
  const [isNoMore, setIsNoMore] = useState(false)
  const { formatIndexingTechniqueAndMethod } = useKnowledge()

  useInfiniteScroll(
    async () => {
      if (!isNoMore) {
        // const { data, has_more } = await fetchDatasets({ url: '/datasets', params: { page } })
        // setPage(getPage() + 1)
        // setIsNoMore(!has_more)
        // const newList = [...(datasets || []), ...data.filter(item => item.indexing_technique || item.provider === 'external')]
        // setDataSets(newList)
        // setLoaded(true)
        // if (!selected.find(item => !item.name))
        //   return { list: [] }
        //
        // const newSelected = produce(selected, (draft) => {
        //   selected.forEach((item, index) => {
        //     if (!item.name) { // not fetched database
        //       const newItem = newList.find(i => i.id === item.id)
        //       if (newItem){
        //         draft[index] = newItem
        //       }
        //     }
        //   })
        // })
        // setSelected(newSelected)
      }
      return { list: [] }
    },
    {
      target: listRef,
      isNoMore: () => {
        return isNoMore
      },
      reloadDeps: [isNoMore],
    },
  )

  const toggleSelect = (dataSet: FileSet) => {
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
  }

  // utils
  const getFileType = (currentFile: File) => {
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
  }

  const { theme } = useTheme()
  const chartColor = useMemo(() => theme === Theme.dark ? '#5289ff' : '#296dff', [theme])

  const candidateFileList: FileSet[] = [
    {
      id: '83472087-d46e-4e56-bebc-3b751c61623a',
      name: '女装店铺全店宝贝数据.xlsx',
      size: 20394,
      extension: 'xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      created_by: '005f6d83-d33e-4fde-894b-408ee2211cb8',
      created_at: 1748507118,
    },
    {
      id: 'a8276524-f13d-4fa6-920e-e8c04f68c042',
      name: '女装店铺客服常见问题回复.xlsx',
      size: 14283,
      extension: 'xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      created_by: '005f6d83-d33e-4fde-894b-408ee2211cb8',
      created_at: 1748595763,
    },
  ]
  return (
    <div className="mb-5">
      <div className='space-y-1 max-w-[640px] cursor-default'>
        {fileList.map((fileItem, index) => (
          <div
            key={`${fileItem.fileID}-${index}`}
            onClick={() => fileItem.file?.id && onPreview(fileItem.file)}
            className={cn(
              'flex items-center h-12 max-w-[640px] bg-components-panel-on-panel-item-bg text-xs leading-3 text-text-tertiary border border-components-panel-border rounded-lg shadow-xs',
              // 'border-state-destructive-border bg-state-destructive-hover',
            )}
          >
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
                {/* <span className='px-1 text-text-quaternary'>·</span>
                  <span>10k characters</span> */}
              </div>
            </div>
            <div className="shrink-0 flex items-center justify-end gap-1 pr-3 w-16">
              {/* <span className="flex justify-center items-center w-6 h-6 cursor-pointer">
                  <RiErrorWarningFill className='size-4 text-text-warning' />
                </span> */}
              {(fileItem.progress < 100 && fileItem.progress >= 0) && (
                // <div className={s.percent}>{`${fileItem.progress}%`}</div>
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
      <Modal isShow={isShow} onClose={onClose} className='w-[400px]' title={t('appDebug.feature.dataSet.selectTitle')}>
        {!loaded && (
          <div className='flex h-[200px]'>
            <Loading type='area'/>
          </div>
        )}

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
        {loaded && (
          <div className='flex justify-between items-center mt-8'>
            <div className='text-sm  font-medium text-text-secondary'>
              {selected.length > 0 && `${selected.length} ${t('appDebug.feature.dataSet.selected')}`}
            </div>
            <div className='flex space-x-2'>
              <Button onClick={onClose}>{t('common.operation.cancel')}</Button>
              <Button variant='primary' onClick={handleSelect}>{t('common.operation.add')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
export default React.memo(SelectDataSet)
