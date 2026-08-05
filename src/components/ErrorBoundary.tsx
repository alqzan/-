import { Component, type ErrorInfo, type ReactNode } from 'react'
import { downloadBackup } from '../lib/backup'
import { EmbraceMark } from './illustrations'

// ============================================================
// شبكة الأمان الأخيرة.
//
// بدون هذا المكوّن، أي خطأ render واحد يعني شاشة بيضاء — والمستخدم
// يعيد الفتح فيقع في نفس الخطأ لأن البيانات المسبِّبة له محفوظة محليًا.
// النتيجة: تطبيق ميت وذكريات محبوسة بداخله.
//
// لذلك أهم زر هنا هو **تنزيل النسخة الاحتياطية**: يعمل حتى والواجهة
// منهارة، لأنه يقرأ الحالة من الذاكرة ولا يمرّ بشجرة React.
// ============================================================

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  downloaded: string | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, downloaded: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // يظهر في طرفية المتصفح ليساعد على التشخيص لاحقًا
    console.error('[طفلنا] خطأ غير متوقع:', error, info.componentStack)
  }

  private handleBackup = async () => {
    // نحاول النسخة الكاملة (بالتسجيلات)، فإن تعذّر مخزن الوسائط والواجهة
    // منهارة أصلًا ننزّل البيانات وحدها بدل ألّا ننزّل شيئًا.
    try {
      this.setState({ downloaded: await downloadBackup(true) })
    } catch {
      try {
        this.setState({ downloaded: await downloadBackup(false) })
      } catch {
        this.setState({ downloaded: 'تعذّر التنزيل' })
      }
    }
  }

  render() {
    const { error, downloaded } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-dvh bg-paper-50 px-5 py-10 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <EmbraceMark className="w-24 h-16 mx-auto mb-5 text-clay-300" />
          <h1 className="title-lg mb-3">صار خلل غير متوقّع</h1>
          <p className="text-ink-600 leading-relaxed mb-6">
            ذكرياتكم ما زالت محفوظة على الجهاز ولم يُمسّ شيء منها.
            نزّلوا نسخة احتياطية الآن للاطمئنان، ثم أعيدوا فتح التطبيق.
          </p>

          <div className="card text-start">
            <button
              onClick={() => void this.handleBackup()}
              className="btn btn-primary w-full py-3.5 mb-3"
            >
              تنزيل نسخة احتياطية
            </button>
            {downloaded && (
              <p role="status" className="text-sm text-ink-600 bg-paper-200 rounded-2xl p-3 mb-3">
                تم التنزيل: {downloaded}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn btn-ghost w-full py-3.5"
            >
              إعادة فتح التطبيق
            </button>
          </div>

          <details className="mt-6 text-start">
            <summary className="text-xs text-ink-400 cursor-pointer">تفاصيل تقنية</summary>
            <pre className="mt-2 text-[11px] text-ink-500 bg-paper-100 rounded-2xl p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
