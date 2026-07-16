import type { TeachingPlatformFileListResponse } from '@/models/datasets'
import { get } from './base'

// Keep /fileList and the email query parameter compatible with the customized
// 1.0.1 deployment; the API also checks the email against the current session.
export const fetchTeachingFileList = (email: string) =>
  get<TeachingPlatformFileListResponse>(`/fileList?email=${encodeURIComponent(email)}`)
