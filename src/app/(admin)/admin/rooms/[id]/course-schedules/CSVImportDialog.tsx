'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CSVRow, CSV_HEADERS } from '@/lib/course-schedules'
import { importCourseSchedulesFromCSV } from './actions'
import { Upload } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  userId: string
}

export function CSVImportDialog({ open, onOpenChange, roomId, userId }: Props) {
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [allRows, setAllRows] = useState<CSVRow[]>([])
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) return

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/\s+/g, '_').replace(/['"]/g, ''))
      const rows: CSVRow[] = []
      const allParsedRows: CSVRow[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => {
          row[h] = values[idx] || ''
        })

        const parsedRow: CSVRow = {
          mata_kuliah: row.mata_kuliah || '',
          dosen: row.dosen || '',
          fakultas: row.fakultas || '',
          kelas: row.kelas || '',
          semester: row.semester || '',
          ruangan: row.ruangan || '',
          hari: row.hari || '',
          jam_mulai: row.jam_mulai || row.jam_mulai || '',
          jam_selesai: row.jam_selesai || row.jam_selesai || '',
          tanggal_mulai: row.tanggal_mulai || '',
          tanggal_selesai: row.tanggal_selesai || '',
        }

        allParsedRows.push(parsedRow)
        if (i < 6) rows.push(parsedRow)
      }

      setPreview(rows)
      setAllRows(allParsedRows)
    }
    reader.readAsText(file)
  }, [])

  const handleImport = async () => {
    setLoading(true)
    const result = await importCourseSchedulesFromCSV(allRows, userId)
    setResults(result)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Import Jadwal Kuliah dari CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Upload className="h-8 w-8" />
              <span>Klik untuk pilih file CSV atau drag & drop di sini</span>
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Preview (5 baris pertama dari {allRows.length} total):</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {CSV_HEADERS.map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-xs font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{row.mata_kuliah}</td>
                        <td className="px-2 py-1">{row.dosen}</td>
                        <td className="px-2 py-1">{row.fakultas}</td>
                        <td className="px-2 py-1">{row.kelas}</td>
                        <td className="px-2 py-1">{row.semester}</td>
                        <td className="px-2 py-1">{row.ruangan}</td>
                        <td className="px-2 py-1">{row.hari}</td>
                        <td className="px-2 py-1">{row.jam_mulai}</td>
                        <td className="px-2 py-1">{row.jam_selesai}</td>
                        <td className="px-2 py-1">{row.tanggal_mulai}</td>
                        <td className="px-2 py-1">{row.tanggal_selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium">
                Berhasil: {results.success} | Gagal: {results.failed}
              </p>
              {results.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button onClick={handleImport} disabled={loading || allRows.length === 0}>
              {loading ? 'Mengimport...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
