import { loadQuery } from 'react-relay'

export const createPreloadForContext = (context: any) => (metadata: any) => {
  if (!context) {
    return undefined
  }

  if (typeof metadata !== 'object') {
    return undefined
  }

  return loadQuery(
    context.relayEnvironment,
    metadata.document,
    metadata.variables,
    metadata.options
  )
}
