import { useCallback } from 'react'
import InstallBundle from '@/app/components/plugins/install-plugin/install-bundle'
import { useAppContext } from '@/context/app-context'
import { useStore } from './store'

const PluginDependency = () => {
  const { isCurrentWorkspaceManager } = useAppContext()
  const dependencies = useStore(s => s.dependencies)

  const handleCancelInstallBundle = useCallback(() => {
    const { setDependencies } = useStore.getState()
    setDependencies([])
  }, [])

  // Plugin installation and version changes are managed by teachers. Keep
  // dependency detection intact for students, but never interrupt app loading
  // with an installation modal they are not allowed to act on.
  if (!isCurrentWorkspaceManager || !dependencies.length)
    return null

  return (
    <InstallBundle
      fromDSLPayload={dependencies}
      onClose={handleCancelInstallBundle}
    />
  )
}

export default PluginDependency
