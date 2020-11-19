/// <reference lib="dom" />

declare module 'minipass-fetch' {
  const MinipassRequest = Request
  const MinipassResponse = Response
  const MinipassHeaders = Headers

  export default fetch
  export {
    MinipassRequest as Request,
    MinipassResponse as Response,
    MinipassHeaders as Headers,
  }
}
