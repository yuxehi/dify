import type { RelatedAppResponse } from '@/models/datasets'
import * as React from 'react'
import { useDatasetDetailContextWithSelector } from '@/context/dataset-detail'
import ApiAccess from './api-access'
import Statistics from './statistics'

type IExtraInfoProps = {
  relatedApps?: RelatedAppResponse
  documentCount?: number
  expand: boolean
  showApiAccess?: boolean
}

const ExtraInfo = ({
  relatedApps,
  documentCount,
  expand,
  showApiAccess = true,
}: IExtraInfoProps) => {
  const apiEnabled = useDatasetDetailContextWithSelector(state => state.dataset?.enable_api)

  return (
    <>
      {expand && (
        <Statistics
          expand={expand}
          documentCount={documentCount}
          relatedApps={relatedApps}
        />
      )}
      {/* The service API is an administration surface. Teaching students keep
          the useful dataset statistics without seeing the API entry point. */}
      {showApiAccess && (
        <ApiAccess
          expand={expand}
          apiEnabled={apiEnabled ?? false}
        />
      )}
    </>
  )
}

export default React.memo(ExtraInfo)
