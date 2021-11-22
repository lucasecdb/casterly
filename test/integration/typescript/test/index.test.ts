import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3002

describe('Hello World in TS', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(async () => {
    await browser.close()
  })

  it('should render a hello world page', async () => {
    await page.goto(`http://localhost:${port}/`)

    await expect(page.content()).resolves.toMatch(
      '<h1>Hello world from TS!</h1>'
    )
  })
})
