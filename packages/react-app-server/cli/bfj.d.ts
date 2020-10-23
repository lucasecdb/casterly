declare module 'bfj' {
  function write(path: string, json?: Record<string, unknown>): Promise<void>

  type Bfj = {
    write: typeof write
  }

  const bfj: Bfj

  export default bfj
}
