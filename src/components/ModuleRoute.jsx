import { Navigate, useLocation } from 'react-router-dom'
import { useModules } from '../contexts/ModulesContext'
import { getModuleComponent } from '../config/componentRegistry'

export default function ModuleRoute({ module }) {
  const { getModuleByRoute } = useModules()
  const location = useLocation()

  if (!module) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  const element = getModuleComponent(module.component)
  if (!element) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  return element
}
