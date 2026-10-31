// بيانات وهمية بالكامل لمعاينة الكتاب فقط
import { chromium } from 'playwright'
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAIAQMAAADXuMJrAAAABlBMVEXd2NHpwH2crJsCAAAAD0lEQVQI12NgYGBgYGAAAAAEAAHI6uZIAAAAAElFTkSuQmCC'
const iso = (d) => new Date(d).toISOString()
const data = {
  version: 6, setupComplete: true,
  child: { name: 'سلمان', gender: 'boy', bornAt: iso('2026-03-10T08:00:00Z'), parents: { momName: 'سارة', dadName: 'أحمد' }, photo: null },
  kicks: [], contractions: [], appointments: [], momLogs: [], medications: [], medDoses: [],
  journal: [
    { id: 'j1', title: 'زيارة المستشفى', text: 'أول مرة نحمله ونحن نصدّق أنه صار بيننا.', date: iso('2026-03-11T10:00:00Z'), author: 'mom' },
    { id: 'j2', text: 'ضحك لأول مرة وهو ينظر إلى أبيه.', date: iso('2026-05-02T10:00:00Z'), author: 'dad' },
    { id: 'j3', title: 'أول عيد ميلاد', text: 'سنة كاملة! شمعة واحدة وضحكة كبيرة.', date: iso('2027-03-10T10:00:00Z'), author: 'mom' },
    { id: 'j4', text: 'صار يقول «بابا» ويشير لكل شي.', date: iso('2027-09-02T10:00:00Z'), author: 'dad' },
  ],
  photos: [
    { id: 'p1', dataUrl: png, caption: 'أول يوم', date: iso('2026-03-11T10:05:00Z'), author: 'mom', memoryId: 'j1' },
    { id: 'p2', dataUrl: png, caption: 'عيد ميلاده', date: iso('2027-03-10T10:05:00Z'), author: 'mom', memoryId: 'j3', favorite: true },
  ],
  voices: [], capsules: [], milestones: [{ id: 'ms1', title: 'أول ابتسامة', emoji: '', achievedAt: iso('2026-04-20T10:00:00Z'), builtIn: true, note: 'كانت لأمه' }],
  names: [], checklist: [], feedings: [], diapers: [], sleep: [], growth: [], vaccines: [], syncMeta: { rev: {}, deleted: {} },
}
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 900 }, locale: 'ar-SA' })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript((d) => { if (!localStorage.getItem('tafalna:v2')) localStorage.setItem('tafalna:v2', JSON.stringify(d)) }, data)
await p.goto('http://localhost:4399/story/book'); await p.waitForTimeout(1500)
await p.screenshot({ path: '/tmp/shots/book-top.png', fullPage: false })
await p.screenshot({ path: '/tmp/shots/book-full.png', fullPage: true })
await p.pdf({ path: '/tmp/shots/book.pdf', format: 'A4', printBackground: true })
await p.goto('http://localhost:4399/story/milestones'); await p.waitForTimeout(800)
await p.screenshot({ path: '/tmp/shots/milestones.png' })
console.log('errors', JSON.stringify(errs))
await b.close()
