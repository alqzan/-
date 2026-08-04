// =============================================================
// بطاقة ذكرى للمشاركة.
//
// الأهل يشاركون لحظات أطفالهم مع العائلة، والبديل اليوم هو لقطة شاشة
// فيها شريط التنقّل وحالة البطارية. هنا نرسم البطاقة بأنفسنا على canvas
// بنفس هوية التطبيق (ورق، حبر، خط ثمانية) ونخرجها صورة واحدة أنيقة.
//
// كل شيء محلي: لا رفع، ولا خادم، ولا رابط — الصورة تنتج على الجهاز.
// =============================================================

const WIDTH = 1080
const HEIGHT = 1350
const MARGIN = 84

const PAPER = '#FDFBF7'
const INK = '#1B1714'
const INK_SOFT = '#77695E'
const LINE = '#E8DFD1'
const CLAY = '#A9532A'

export interface ShareCardInput {
  /** صورة الذكرى إن وُجدت (Data URL) */
  imageSrc?: string
  title?: string
  body?: string
  /** سطر التاريخ والمرحلة: «١٢ مايو ٢٠٢٦ • الأسبوع ٢٤ من الحمل» */
  meta: string
  childName: string
}

/** يحمّل صورة ويعيدها جاهزة للرسم */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('تعذّر تحميل الصورة'))
    img.src = src
  })
}

/**
 * الخطوط لا تكون جاهزة على canvas لمجرد أن الصفحة تستخدمها؛ لا بد من
 * طلبها صراحةً وإلا رسم المتصفح بخط بديل وخرجت البطاقة بهوية غريبة.
 */
async function ensureFonts(): Promise<void> {
  if (!document.fonts?.load) return
  await Promise.all([
    document.fonts.load('700 64px "Thmanyah Serif Display"'),
    document.fonts.load('400 38px "Thmanyah Serif Text"'),
    document.fonts.load('500 30px "Thmanyah Sans"'),
  ]).catch(() => undefined)
}

/** يلفّ نصًّا عربيًا على أسطر بعرض محدّد ويعيد الأسطر */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line)
        line = word
        if (lines.length === maxLines) return trimLast(ctx, lines, maxWidth)
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
    if (lines.length >= maxLines) return trimLast(ctx, lines, maxWidth)
  }
  return lines
}

/** يضيف «…» إلى آخر سطر حين يُقتطع النص */
function trimLast(ctx: CanvasRenderingContext2D, lines: string[], maxWidth: number): string[] {
  const last = lines[lines.length - 1]
  let trimmed = last
  while (trimmed.length > 3 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1)
  }
  lines[lines.length - 1] = `${trimmed}…`
  return lines
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** يرسم البطاقة ويعيدها Blob بصيغة PNG */
export async function buildShareCard(input: ShareCardInput): Promise<Blob> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذّر تجهيز البطاقة')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // النص العربي يُرسم من اليمين
  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'

  const right = WIDTH - MARGIN
  const contentWidth = WIDTH - MARGIN * 2
  let y = MARGIN

  // ترويسة: اسم الطفل
  ctx.font = '500 30px "Thmanyah Sans", sans-serif'
  ctx.fillStyle = INK_SOFT
  ctx.fillText(input.childName, right, y)
  y += 58

  // الصورة (إن وُجدت) بقصّ يملأ الإطار
  if (input.imageSrc) {
    const img = await loadImage(input.imageSrc).catch(() => null)
    if (img) {
      const frameH = 720
      ctx.save()
      roundedRect(ctx, MARGIN, y, contentWidth, frameH, 36)
      ctx.clip()
      const scale = Math.max(contentWidth / img.width, frameH / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, MARGIN + (contentWidth - w) / 2, y + (frameH - h) / 2, w, h)
      ctx.restore()
      ctx.strokeStyle = LINE
      ctx.lineWidth = 2
      roundedRect(ctx, MARGIN, y, contentWidth, frameH, 36)
      ctx.stroke()
      y += frameH + 56
    }
  }

  // العنوان
  if (input.title) {
    ctx.font = '700 60px "Thmanyah Serif Display", serif'
    ctx.fillStyle = INK
    for (const line of wrapText(ctx, input.title, contentWidth, 2)) {
      ctx.fillText(line, right, y)
      y += 82
    }
    y += 14
  }

  // النص
  if (input.body) {
    ctx.font = '400 38px "Thmanyah Serif Text", serif'
    ctx.fillStyle = INK_SOFT
    const maxLines = input.imageSrc ? 3 : 9
    for (const line of wrapText(ctx, input.body, contentWidth, maxLines)) {
      ctx.fillText(line, right, y)
      y += 62
    }
  }

  // التذييل: فاصل + التاريخ والمرحلة + توقيع التطبيق
  const footerY = HEIGHT - MARGIN - 76
  ctx.strokeStyle = LINE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(MARGIN, footerY)
  ctx.lineTo(WIDTH - MARGIN, footerY)
  ctx.stroke()

  ctx.font = '500 30px "Thmanyah Sans", sans-serif'
  ctx.fillStyle = INK_SOFT
  ctx.fillText(input.meta, right, footerY + 28)

  ctx.textAlign = 'left'
  ctx.fillStyle = CLAY
  ctx.fillText('طفلنا', MARGIN, footerY + 28)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('تعذّر إنشاء الصورة'))),
      'image/png',
    )
  })
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * يشارك البطاقة عبر قائمة المشاركة في الجوال، وإلا ينزّلها ملفًّا.
 * (المشاركة بالملفات غير مدعومة في كل المتصفحات، والتنزيل بديل يعمل دائمًا.)
 */
export async function shareCard(blob: Blob, fileName: string): Promise<ShareOutcome> {
  const file = new File([blob], fileName, { type: 'image/png' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (err) {
      // إلغاء المستخدم ليس خطأً — لا نُنزّل الملف رغمًا عنه
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // نؤخّر الإفراج حتى يبدأ التنزيل فعلًا
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'downloaded'
}
