declare module 'bfj' {
  declare function write(
    path: string,
    json?: Record<string, unknown>
  ): Promise<void>
}
