declare module 'private-casterly-loader' {
  export const createPreloadForContext: (
    context: unknown
  ) => (metadata: unknown) => unknown
}
