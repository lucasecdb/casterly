import { loadQuery } from 'react-relay'

export const createPreloadForContext = (context: any) => (metadata: any) => {
  return loadQuery(context.relayEnvironment, metadata, {})
}
