import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3004

describe('Hello World with async modules', () => {
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
    const response = await page.goto(`http://localhost:${port}/`)

    expect(response?.headers()['content-type']).toMatch('text/html')

    await expect(page.content()).resolves.toMatch(
      '<h1>Hello world from async module!</h1>'
    )
  })
})
