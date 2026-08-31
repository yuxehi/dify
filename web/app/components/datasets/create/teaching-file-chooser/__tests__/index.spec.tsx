import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { fetchTeachingFileList } from '@/service/teaching-file-list'
import TeachingFileChooser from '../index'

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({ userProfile: { email: 'student@example.com' } }),
}))

vi.mock('@/service/teaching-file-list', () => ({
  fetchTeachingFileList: vi.fn(),
}))

const mockFetchTeachingFileList = vi.mocked(fetchTeachingFileList)

describe('TeachingFileChooser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load course files and return the selected upload-file ids', async () => {
    const onFileListUpdate = vi.fn()
    mockFetchTeachingFileList.mockResolvedValue({
      data: [{ id: 'upload-1', name: 'lesson.pdf', extension: 'pdf', mime_type: 'application/pdf' }],
    })

    render(
      <TeachingFileChooser
        fileList={[]}
        isShow
        onClose={vi.fn()}
        onFileListUpdate={onFileListUpdate}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'lesson.pdf' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.operation.add' }))

    await waitFor(() => {
      expect(mockFetchTeachingFileList).toHaveBeenCalledWith('student@example.com')
      expect(onFileListUpdate).toHaveBeenCalledWith([
        expect.objectContaining({
          fileID: 'teaching-upload-1',
          progress: 100,
          file: expect.objectContaining({ id: 'upload-1' }),
        }),
      ])
    })
  })

  it('should show an empty state when the platform has no files', async () => {
    mockFetchTeachingFileList.mockResolvedValue({ data: [] })

    render(
      <TeachingFileChooser
        fileList={[]}
        isShow
        onClose={vi.fn()}
        onFileListUpdate={vi.fn()}
      />,
    )

    expect(await screen.findByText('datasetCreation.stepOne.teachingSource.noAvailableFiles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'common.operation.add' })).toBeDisabled()
  })
})
