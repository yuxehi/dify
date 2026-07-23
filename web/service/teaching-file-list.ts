import type { TeachingPlatformFileListResponse } from '@/models/datasets'
import { get } from './base'

export type TeachingFileScope = 'self' | 'all'

// Students retain the customized 1.0.1 email contract. The all-files scope is
// sent without an email and is authorized again by the API for workspace
// owners/administrators only.
export const fetchTeachingFileList = (email: string, scope: TeachingFileScope = 'self') =>
  get<TeachingPlatformFileListResponse>(scope === 'all'
    ? '/fileList?scope=all'
    : `/fileList?email=${encodeURIComponent(email)}`)
