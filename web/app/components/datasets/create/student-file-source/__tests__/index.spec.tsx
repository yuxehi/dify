import type { CustomFile, FileItem } from '@/models/datasets'
import { fireEvent, render, screen } from '@testing-library/react'
import StudentFileSource from '../index'

const createFileItem = (name: string, id: string): FileItem => {
  const file = Object.assign(new File([], name, { type: 'text/plain' }), {
    id,
    extension: 'txt',
  }) as CustomFile

  return { file, fileID: `teaching-${id}`, progress: 100 }
}

describe('StudentFileSource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should open the teaching-platform file chooser', () => {
    const onBrowse = vi.fn()

    render(<StudentFileSource files={[]} onBrowse={onBrowse} onFilesChange={vi.fn()} onPreview={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'datasetCreation.stepOne.teachingSource.selectButton' }))

    expect(onBrowse).toHaveBeenCalledOnce()
    expect(screen.getByText('datasetCreation.stepOne.teachingSource.empty')).toBeInTheDocument()
  })

  it('should show selected files and remove only the requested file', () => {
    const files = [createFileItem('lesson-one.txt', '1'), createFileItem('lesson-two.txt', '2')]
    const onFilesChange = vi.fn()

    render(<StudentFileSource files={files} onBrowse={vi.fn()} onFilesChange={onFilesChange} onPreview={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /datasetCreation\.stepOne\.teachingSource\.removeFile/ })[0]!)

    expect(screen.getByText('lesson-one.txt')).toBeInTheDocument()
    expect(screen.getByText('lesson-two.txt')).toBeInTheDocument()
    expect(onFilesChange).toHaveBeenCalledWith([files[1]])
  })

  it('should preview a selected teaching-platform file when its row is clicked', () => {
    const file = createFileItem('lesson-preview.txt', 'preview-1')
    const onPreview = vi.fn()

    render(<StudentFileSource files={[file]} onBrowse={vi.fn()} onFilesChange={vi.fn()} onPreview={onPreview} />)
    fireEvent.click(screen.getByRole('button', { name: /datasetCreation\.stepOne\.filePreview.*lesson-preview\.txt/i }))

    expect(onPreview).toHaveBeenCalledOnce()
    expect(onPreview).toHaveBeenCalledWith(file.file)
  })

  it('should let administrators use the source without duplicating the uploader file list', () => {
    const file = createFileItem('admin-visible-in-uploader.txt', 'admin-1')

    render(
      <StudentFileSource
        files={[file]}
        showSelectedFiles={false}
        onBrowse={vi.fn()}
        onFilesChange={vi.fn()}
        onPreview={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'datasetCreation.stepOne.teachingSource.selectButton' })).toBeInTheDocument()
    expect(screen.queryByText('admin-visible-in-uploader.txt')).not.toBeInTheDocument()
  })
})
