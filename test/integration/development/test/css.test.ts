import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3000

describe('Hello World', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(async () => {
    await browser.close()
  })

  it('should load css files correctly', async () => {
    await page.goto(`http://localhost:${port}/css`, {
      waitUntil: 'networkidle2',
    })

    await expect(
      page.evaluate(() => {
        return window
          .getComputedStyle(document.querySelector('.blue'))
          .getPropertyValue('color')
      })
    ).resolves.toBe('rgb(0, 0, 255)')

    await expect(
      page.evaluate(() => {
        return window
          .getComputedStyle(document.querySelector('p'))
          .getPropertyValue('color')
      })
    ).resolves.toBe('rgb(255, 0, 0)')
  })
})
