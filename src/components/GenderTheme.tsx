import { useEffect } from 'react'
import { useAppData } from '../data/dataService'
import type { Gender } from '../data/types'

/** يختار لوحة الألوان من جنس الطفل المحفوظ في ملفه. */
export default function GenderTheme({ gender: preview }: { gender?: Gender } = {}) {
  const storedGender = useAppData().child.gender
  const gender = preview ?? storedGender

  useEffect(() => {
    document.documentElement.dataset.gender = gender
    return () => {
      delete document.documentElement.dataset.gender
    }
  }, [gender])

  return null
}
