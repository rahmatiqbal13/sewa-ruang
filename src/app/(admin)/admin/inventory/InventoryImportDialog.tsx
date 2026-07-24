'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useRouter } from 'next/navigation'
import { Upload, FileSpreadsheet, Download, X, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { importInventoryFromExcel } from './importInventory'
import { downloadInventoryTemplate } from './exportInventory'
import type { ImportResult } from '../equipment/importEquipment'

interface InventoryImportDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryImportDialog({ isOpen, onClose }: InventoryImportDialogProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  async function handleImport() {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // roomId = null: import tanpa ruangan, ruangan bisa diisi manual nanti
      const importResult = await importInventoryFromExcel(formData, '')
      setResult(importResult)
      if (importResult.successCount > 0) {
        router.refresh()
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Terjadi kesalahan saat mengimport',
        totalRows: 0,
        successCount: 0,
        skippedCount: 0,
        errorCount: 1,
        importedIds: [],
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Unknown error' }],
      })
    } finally {
      setIsUploading(false)
    }
  }

  function handleClose() {
    setFile(null)
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Inventaris
          </DialogTitle>
          <DialogDescription>
            Unggah file Excel berisi daftar barang inventaris.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <>
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-blue-900">Template Excel</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Format kolom: Nama Barang, Merk, Jumlah, Kondisi, Keterangan
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadInventoryTemplate}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {/* Info tanpa ruangan */}
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 text-sm text-amber-800">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <p>
                Ruangan tidak perlu dipilih saat import. Setelah import, buka item inventaris dan edit untuk menentukan ruangannya.
              </p>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-[14px] p-8 text-center transition-colors cursor-pointer',
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-muted-foreground/30 hover:border-muted-foreground/50',
                file && 'border-green-500 bg-green-50',
                isUploading && 'opacity-50 cursor-not-allowed',
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-muted-foreground/70 mx-auto mb-3" />
                  <p className="font-medium text-foreground/80">
                    {isDragActive ? 'Lepaskan file di sini' : 'Klik atau seret file Excel ke sini'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Format: .xlsx, .xls</p>
                </>
              )}
            </div>
          </>
        )}

        {isUploading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengimport inventaris...
          </div>
        )}

        {result && (
          <div className={cn(
            'rounded-[10px] p-4',
            result.success
              ? 'bg-green-50 border border-green-200'
              : result.successCount > 0 || result.errorCount === 0
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-red-50 border border-red-200',
          )}>
            <div className="flex items-start gap-3">
              {result.success || result.errorCount === 0
                ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                : <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
              <div className="flex-1">
                <h4 className={cn(
                  'font-medium',
                  result.success ? 'text-green-900' : result.errorCount === 0 ? 'text-blue-900' : 'text-red-900',
                )}>
                  {result.success ? 'Import Berhasil!' : result.errorCount === 0 ? 'Tidak Ada Perubahan' : 'Import Selesai dengan Catatan'}
                </h4>
                <p className={cn(
                  'text-sm mt-1',
                  result.success ? 'text-green-700' : result.errorCount === 0 ? 'text-blue-700' : 'text-red-700',
                )}>
                  {result.message}
                </p>
                <div className="flex gap-4 mt-3 text-sm">
                  <span className="text-muted-foreground">Total: <strong>{result.totalRows}</strong> baris</span>
                  {result.successCount > 0 && (
                    <span className="text-green-600">Berhasil: <strong>{result.successCount}</strong></span>
                  )}
                  {result.errorCount > 0 && (
                    <span className="text-red-600">Gagal: <strong>{result.errorCount}</strong></span>
                  )}
                </div>
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-foreground/80 mb-2">Detail Error:</p>
                    <div className="bg-card rounded-[10px] border max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Baris</th>
                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.slice(0, 10).map((error, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-2 text-muted-foreground">{error.row}</td>
                              <td className="px-3 py-2 text-red-600">{error.message}</td>
                            </tr>
                          ))}
                          {result.errors.length > 10 && (
                            <tr>
                              <td colSpan={2} className="px-3 py-2 text-center text-muted-foreground text-xs">
                                ...dan {result.errors.length - 10} error lainnya
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Batal
              </Button>
              <Button
                onClick={handleImport}
                disabled={!file || isUploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Inventaris
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Tutup</Button>
              {result.errorCount > 0 && (
                <Button variant="outline" onClick={() => setResult(null)}>Coba Lagi</Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
