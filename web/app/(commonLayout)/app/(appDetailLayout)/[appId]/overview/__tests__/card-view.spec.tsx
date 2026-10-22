import type { App } from '@/types/app'
import { render, screen } from '@testing-library/react'
import { AppModeEnum } from '@/types/app'
import CardView from '../card-view'

let mockIsCurrentWorkspaceManager = true

const appDetail = {
  id: 'app-1',
  name: 'Teaching App',
  mode: AppModeEnum.CHAT,
} as App

vi.mock('@/context/app-context', () => ({
  useAppContext: () => ({
    isCurrentWorkspaceManager: mockIsCurrentWorkspaceManager,
  }),
}))

vi.mock('@/app/components/app/store', () => ({
  useStore: (selector: (state: { appDetail: App, setAppDetail: () => void }) => unknown) => selector({
    appDetail,
    setAppDetail: vi.fn(),
  }),
}))

vi.mock('@/app/components/app/overview/app-card', () => ({
  default: ({ cardType }: { cardType: string }) => <div data-testid={`app-card-${cardType}`} />,
}))

vi.mock('@/app/components/app/overview/trigger-card', () => ({
  default: () => <div data-testid="trigger-card" />,
}))

vi.mock('@/app/components/tools/mcp/mcp-service-card', () => ({
  default: () => <div data-testid="mcp-service-card" />,
}))

vi.mock('@/app/components/workflow/collaboration/core/collaboration-manager', () => ({
  collaborationManager: {
    onAppStateUpdate: () => vi.fn(),
  },
}))

vi.mock('@/app/components/workflow/collaboration/core/websocket-manager', () => ({
  webSocketClient: {
    getSocket: () => null,
  },
}))

vi.mock('@/service/use-workflow', () => ({
  useAppWorkflow: () => ({ data: undefined }),
}))

describe('CardView student permissions', () => {
  beforeEach(() => {
    mockIsCurrentWorkspaceManager = true
  })

  it('shows the MCP service card in the app side panel for a manager', () => {
    render(<CardView appId="app-1" isInPanel />)

    expect(screen.getByTestId('mcp-service-card')).toBeInTheDocument()
  })

  it('hides only the MCP service card in the app side panel for a student', () => {
    mockIsCurrentWorkspaceManager = false

    render(<CardView appId="app-1" isInPanel />)

    expect(screen.queryByTestId('mcp-service-card')).not.toBeInTheDocument()
    expect(screen.getByTestId('app-card-webapp')).toBeInTheDocument()
    expect(screen.getByTestId('app-card-api')).toBeInTheDocument()
  })
})
