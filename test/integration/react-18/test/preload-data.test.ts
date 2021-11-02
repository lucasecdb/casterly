import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3002

describe('Preloaded data', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should render preloaded data in the server', async () => {
    const response = await page.goto(`http://localhost:${port}/preload-data`)

    expect(response.status()).toBe(200)
  })
})
