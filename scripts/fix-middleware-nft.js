/**
 * Workaround for Next.js 16 + Turbopack bug on Vercel:
 * ENOENT: no such file or directory, open '.next/server/middleware.js.nft.json'
 *
 * This script creates the missing .nft.json trace file after build completes.
 */
const fs = require('fs')
const path = require('path')

const nftPath = path.join(__dirname, '..', '.next', 'server', 'middleware.js.nft.json')

if (!fs.existsSync(nftPath)) {
  fs.mkdirSync(path.dirname(nftPath), { recursive: true })
  fs.writeFileSync(nftPath, JSON.stringify({ version: 1, files: [] }, null, 2))
  console.log('[fix-middleware-nft] Created missing middleware.js.nft.json')
} else {
  console.log('[fix-middleware-nft] middleware.js.nft.json already exists')
}
