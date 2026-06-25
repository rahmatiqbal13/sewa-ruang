import * as fs from 'fs'
import * as path from 'path'

function getLocalChromePath(): string | undefined {
  const platform = process.platform

  if (platform === 'win32') {
    const candidates = [
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  } else if (platform === 'linux') {
    const candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  } else if (platform === 'darwin') {
    const candidates = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
  }

  return process.env.PUPPETEER_EXECUTABLE_PATH || undefined
}

export async function getChromePath(): Promise<string | undefined> {
  // Vercel / serverless environment: use @sparticuz/chromium
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      // Dynamic import to avoid loading on local dev
      const chromium = await import('@sparticuz/chromium')
      return await chromium.default.executablePath()
    } catch {
      // Fallback if package not available
      return getLocalChromePath()
    }
  }

  return getLocalChromePath()
}
