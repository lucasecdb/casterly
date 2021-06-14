import { Headers, Request, Response, fetch } from './fetch'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      Headers: typeof Headers
      Request: typeof Request
      Response: typeof Response
      fetch: typeof fetch
    }
  }
}

export function installGlobals() {
  const anyGlobal = global as any

  anyGlobal.Headers = Headers
  anyGlobal.Request = Request
  anyGlobal.Response = Response
  anyGlobal.fetch = fetch
}
