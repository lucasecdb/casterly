import { resolve } from 'path'

import { killServer, startServer } from '../../test-utils'

describe('Hello World', () => {
  let serverHandle

  beforeAll(async () => {
    serverHandle = await startServer(resolve(__dirname))
  })

  afterAll(async () => {
    await killServer(serverHandle)
  })

  it('should render a hello world page', async () => {
    await page.goto('http://localhost:3000/')

    await expect(page.content()).resolves.toMatch('<p>Hello world!</p>')
  })
})
