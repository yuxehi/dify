import type { TeachingPlatformFileListResponse } from '@/models/datasets'
import { get } from './base'

// Keep the 1.0.1 contract for both teachers and students: the chooser loads
// files associated with the currently signed-in account's email.
export const fetchTeachingFileList = (email: string) =>
  get<TeachingPlatformFileListResponse>(`/fileList?email=${encodeURIComponent(email)}`)
