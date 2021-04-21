import 'expect-puppeteer'
import type puppeteer from 'puppeteer'

declare global {
  const page: puppeteer.Page
}
