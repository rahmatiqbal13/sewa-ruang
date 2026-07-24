'use client'

import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CSVRow, CSV_HEADERS } from '@/lib/course-schedules'
import { importCourseSchedulesFromCSV } from './actions'
import { Upload, Download, FileSpreadsheet } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomId: string
  userId: string
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Data jadwal dengan contoh
  const exampleRows = [
    ['Matematika Diskrit', 'Dr. Ahmad', 'FMIPA', 'Kelas A', 'Ganjil 2026', 'Lab Komputer 1', 'senin', '08:00', '10:00', '2026-02-01', '2026-06-30'],
    ['Fisika Dasar', 'Prof. Sari', 'FMIPA', 'Kelas B', 'Ganjil 2026', 'Ruang Teori 2', 'selasa', '10:00', '12:00', '2026-02-01', '2026-06-30'],
  ]
  const ws = XLSX.utils.aoa_to_sheet([CSV_HEADERS, ...exampleRows])
  ws['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 15 },
    { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Kuliah')

  // Sheet 2: Panduan format
  const guide = [
    ['Kolom', 'Format / Ketentuan', 'Contoh'],
    ['mata_kuliah', 'Nama mata kuliah', 'Matematika Diskrit'],
    ['dosen', 'Nama dosen pengampu', 'Dr. Ahmad Fauzi'],
    ['fakultas', 'Singkatan atau nama fakultas', 'FMIPA'],
    ['kelas', 'Nama kelas', 'Kelas A'],
    ['semester', 'Keterangan semester', 'Ganjil 2026'],
    ['ruangan', 'Harus sama persis dengan nama ruangan di sistem', 'Lab Komputer 1'],
    ['hari', 'Huruf kecil: senin / selasa / rabu / kamis / jumat / sabtu / minggu', 'senin'],
    ['jam_mulai', 'Format 24 jam HH:MM', '08:00'],
    ['jam_selesai', 'Format 24 jam HH:MM', '10:00'],
    ['tanggal_mulai', 'Format YYYY-MM-DD (awal semester)', '2026-02-01'],
    ['tanggal_selesai', 'Format YYYY-MM-DD (akhir semester)', '2026-06-30'],
  ]
  const wsGuide = XLSX.utils.aoa_to_sheet(guide)
  wsGuide['!cols'] = [{ wch: 18 }, { wch: 58 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Panduan')

  XLSX.writeFile(wb, 'template-jadwal-kuliah.xlsx')
}

function parseSheetToRows(ws: XLSX.WorkSheet): CSVRow[] {
  const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (raw.length < 2) return []

  const headers = (raw[0] as string[]).map(h =>
    String(h).toLowerCase().trim().replace(/\s+/g, '_').replace(/['"]/g, '')
  )

  return raw.slice(1)
    .map(row => {
      const r: Record<string, string> = {}
      headers.forEach((h, idx) => { r[h] = String((row as string[])[idx] || '').trim() })
      return {
        mata_kuliah: r.mata_kuliah || '',
        dosen: r.dosen || '',
        fakultas: r.fakultas || '',
        kelas: r.kelas || '',
        semester: r.semester || '',
        ruangan: r.ruangan || '',
        hari: r.hari || '',
        jam_mulai: r.jam_mulai || '',
        jam_selesai: r.jam_selesai || '',
        tanggal_mulai: r.tanggal_mulai || '',
        tanggal_selesai: r.tanggal_selesai || '',
      } as CSVRow
    })
    .filter(r => r.mata_kuliah.trim() !== '' || r.ruangan.trim() !== '')
}

export function CSVImportDialog({ open, onOpenChange, roomId: _roomId, userId }: Props) {
  const [preview, setPreview] = useState<CSVRow[]>([])
  const [allRows, setAllRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResults(null)

    const isCSV = file.name.toLowerCase().endsWith('.csv')

    const reader = new FileReader()

    if (isCSV) {
      reader.onload = ev => {
        const text = ev.target?.result as string
        const wb = XLSX.read(text, { type: 'string' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const parsed = parseSheetToRows(ws)
        setAllRows(parsed)
        setPreview(parsed.slice(0, 5))
      }
      reader.readAsText(file)
    } else {
      reader.onload = ev => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const parsed = parseSheetToRows(ws)
        setAllRows(parsed)
        setPreview(parsed.slice(0, 5))
      }
      reader.readAsArrayBuffer(file)
    }
  }, [])

  const handleImport = async () => {
    setLoading(true)
    const result = await importCourseSchedulesFromCSV(allRows, userId)
    setResults(result)
    setLoading(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setPreview([])
      setAllRows([])
      setFileName('')
      setResults(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Import Jadwal Kuliah</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions + template download */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-[10px]">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900">Cara penggunaan</p>
              <ol className="text-xs text-blue-700 mt-1 space-y-0.5 list-decimal list-inside">
                <li>Download template Excel di bawah, kirim ke prodi/fakultas untuk diisi</li>
                <li>Prodi isi kolom sesuai panduan (ada di sheet &quot;Panduan&quot; di dalam file)</li>
                <li>Prodi kirim balik file ke admin, lalu upload di sini</li>
              </ol>
              <p className="text-xs text-blue-500 mt-1.5">Format yang didukung: <strong>.xlsx</strong> dan <strong>.csv</strong></p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="shrink-0 border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Template .xlsx
            </Button>
          </div>

          {/* File upload area */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="xlsx-upload"
            />
            <label htmlFor="xlsx-upload" className="cursor-pointer flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              {fileName ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <span className="font-medium text-foreground">{fileName}</span>
                  <span className="text-xs">{allRows.length} baris data ditemukan — klik untuk ganti file</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8" />
                  <span>Klik untuk pilih file atau drag & drop di sini</span>
                  <span className="text-xs">Mendukung .xlsx dan .csv</span>
                </>
              )}
            </label>
          </div>

          {/* Preview table */}
          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Preview {preview.length < allRows.length ? `(5 dari ${allRows.length} baris)` : `(${allRows.length} baris)`}:
              </h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {CSV_HEADERS.map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-xs font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1 whitespace-nowrap">{row.mata_kuliah}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{row.dosen}</td>
                        <td className="px-2 py-1">{row.fakultas}</td>
                        <td className="px-2 py-1">{row.kelas}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{row.semester}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{row.ruangan}</td>
                        <td className="px-2 py-1">{row.hari}</td>
                        <td className="px-2 py-1">{row.jam_mulai}</td>
                        <td className="px-2 py-1">{row.jam_selesai}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{row.tanggal_mulai}</td>
                        <td className="px-2 py-1 whitespace-nowrap">{row.tanggal_selesai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import results */}
          {results && (
            <div className={`p-4 rounded-lg ${results.failed === 0 ? 'bg-green-50 border border-green-100' : 'bg-muted'}`}>
              <p className="text-sm font-medium">
                Berhasil: <span className="text-green-700">{results.success}</span>
                {results.failed > 0 && <> &nbsp;|&nbsp; Gagal: <span className="text-red-600">{results.failed}</span></>}
              </p>
              {results.errors.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => handleClose(false)}>
              {results ? 'Tutup' : 'Batal'}
            </Button>
            {!results && (
              <Button onClick={handleImport} disabled={loading || allRows.length === 0}>
                {loading ? 'Mengimport...' : `Import ${allRows.length > 0 ? `(${allRows.length} baris)` : ''}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
