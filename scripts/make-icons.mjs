// ============================================================
// يولّد أيقونات PNG من ملفات SVG في public/icons.
//
// لماذا PNG أصلًا؟ لأن iOS لا يقبل SVG لأيقونة الشاشة الرئيسية: يتجاهل
// الرابط ويضع لقطة من الصفحة مكان الأيقونة. وأندرويد يقبل SVG لكن كثيرًا
// من المشغّلات لا تتعامل مع maskable إلا PNG.
//
// سكربت صيانة يُشغَّل يدويًا عند تغيير الأيقونة فقط — لذلك لا يُضاف
// Playwright إلى تبعيات المشروع، بل يُستدعى عند الحاجة:
//
//   npx --yes playwright-core@1 node scripts/make-icons.mjs
//   # أو مع Playwright مثبّتًا عالميًا:  node scripts/make-icons.mjs
//
// المخرجات تُحفظ في المستودع (public/icons/*.png) فلا يحتاجها البناء العادي.
// ============================================================
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const { chromium } = await import('playwright-core').catch(() => import('playwright'))

const root = path.resolve(import.meta.dirname, '..')
// المصادر خارج public كي لا تُنشر ملفات SVG لا يطلبها أحد ولا يخزّنها
// عامل الخدمة بلا سبب؛ المنشور هو صور PNG وحدها.
const srcDir = path.join(root, 'scripts', 'icon-src')
const outDir = path.join(root, 'public', 'icons')

/** المقاسات المطلوبة: مصدر SVG ← اسم الملف ← الحجم بالبكسل */
const TARGETS = [
  { svg: 'icon.svg', out: 'apple-touch-icon.png', size: 180 },
  { svg: 'icon.svg', out: 'icon-192.png', size: 192 },
  { svg: 'icon.svg', out: 'icon-512.png', size: 512 },
  { svg: 'icon-maskable.svg', out: 'icon-maskable-512.png', size: 512 },
]

const executablePath = process.env.CHROMIUM_PATH || undefined
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] })

for (const { svg, out, size } of TARGETS) {
  const markup = readFileSync(path.join(srcDir, svg), 'utf8')
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(
    `<style>html,body{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  )
  const png = await page.screenshot({ omitBackground: false })
  writeFileSync(path.join(outDir, out), png)
  await page.close()
  console.log(`${out} ← ${svg} (${size}px)`)
}

await browser.close()
