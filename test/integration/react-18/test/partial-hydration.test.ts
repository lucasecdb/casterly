import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer'

const port = 3002

describe('Partial hydration', () => {
  let browser: Browser
  let page: Page

  beforeEach(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage()
  })

  afterEach(() => browser.close())

  it('should request for dynamic component only during hydration', async () => {
    await page.setRequestInterception(true)

    let dynamicComponentRequested = false

    page.on('request', (request) => {
      if (request.url().includes('dynamic-component.js')) {
        dynamicComponentRequested = true
      }

      request.continue()
    })

    const response = await page.goto(
      `http://localhost:${port}/partial-hydration`
    )

    const responseText = await response.text()

    expect(responseText).toMatch('Hello from dynamic component!')
    expect(responseText).not.toMatch('dynamic-component.js')

    expect(dynamicComponentRequested).toBe(false)

    await page.waitForFunction('window.reactIsHydrated === true', {
      timeout: 1000,
    })

    expect(dynamicComponentRequested).toBe(true)

    await page.waitForFunction('window.dynamicComponentLoaded === true', {
      timeout: 1000,
    })

    await page.click('button')

    // Make sure the component is hydrated and
    // event handlers work as expected
    await expect(page.content()).resolves.toMatch(
      'Hello from alternate message!'
    )
  })
})
