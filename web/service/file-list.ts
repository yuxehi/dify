import { get } from './base'
import type { ResFileList } from '@/models/datasets'

export const fetchFileList = (email: string) => {
  return get<ResFileList>(`/fileList?email=${email}`)
}
