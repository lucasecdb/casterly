import { resolve } from 'path'

import { findPort, killServer, startServer } from '../../../test-utils'

describe('Hello World', () => {
  let serverHandle
  let port

  beforeEach(async () => {
    port = await findPort()
    serverHandle = await startServer(resolve(__dirname, '..'), port)
  })

  afterEach(async () => {
    await killServer(serverHandle)
  })

  it('should render a hello world page', async () => {
    await page.goto(`http://localhost:${port}/`)

    await expect(page.content()).resolves.toMatch('<p>Hello world!</p>')
  })

  it('should navigate to /back-links successfully', async () => {
    await page.goto(`http://localhost:${port}/links`, {
      waitUntil: 'networkidle2',
    })

    await page.click('a[href="/back-link"]')

    await page.waitForSelector('span[role="link"]')

    expect(page.url()).toBe(`http://localhost:${port}/back-link`)

    const rootHandle = await page.$('#root')

    const rootHtml = await page.evaluate((rootElement) => {
      return rootElement.outerHTML
    }, rootHandle)

    await rootHandle.dispose()

    expect(rootHtml).toMatch(
      `<div id="root"><span role="link" tabindex="0">Go back</span></div>`
    )
  })
})
