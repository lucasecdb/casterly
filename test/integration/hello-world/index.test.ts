import { resolve } from 'path'

import puppeteer from 'puppeteer'

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
    const browser = await puppeteer.launch()

    const page = await browser.newPage()

    await page.goto('http://localhost:3000/')

    expect(await page.content()).toMatch('<p>Hello world!</p>')
  })
})
