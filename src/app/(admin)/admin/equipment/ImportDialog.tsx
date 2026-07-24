'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, Download, X, Loader2, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ImportResult } from '../equipment/importEquipment'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (formData: FormData) => Promise<ImportResult>
  onDownloadTemplate: () => void
  onUndoImport?: (ids: string[]) => Promise<{ success: boolean; message: string }>
  onDeleteAll?: () => Promise<{ success: boolean; message: string; deletedCount?: number }>
  title?: string
  description?: string
  entityName?: string
}

export function ImportDialog({
  isOpen,
  onClose,
  onImport,
  onDownloadTemplate,
  onUndoImport,
  onDeleteAll,
  title = 'Import Data',
  description = 'Unggah file Excel untuk mengimport data',
  entityName = 'data'
}: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [isDeletingAll, setIsDeletingAll] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [, setDeleteAllError] = useState<string | null>(null)
  const [, setDeleteAllSuccess] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isUndone, setIsUndone] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: isUploading
  })

  async function handleImport() {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const importResult = await onImport(formData)
      setResult(importResult)
      
      if (importResult.success) {
        // Keep dialog open to show success message
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
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Unknown error' }]
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

  function handleReset() {
    setFile(null)
    setResult(null)
    setIsUndone(false)
  }

  async function handleUndo() {
    if (!result?.importedIds.length || !onUndoImport) return

    setIsUndoing(true)
    try {
      const undoResult = await onUndoImport(result.importedIds)
      if (undoResult.success) {
        setIsUndone(true)
      }
    } catch (error) {
      console.error('Undo error:', error)
    } finally {
      setIsUndoing(false)
    }
  }

  async function handleDeleteAll() {
    if (!onDeleteAll) return

    setIsDeletingAll(true)
    setDeleteAllError(null)
    try {
      console.log('ImportDialog - Calling onDeleteAll...')
      const deleteResult = await onDeleteAll()
      console.log('ImportDialog - Delete result:', deleteResult)
      
      if (deleteResult.success) {
        setShowDeleteAllConfirm(false)
        setDeleteAllSuccess(`Berhasil menghapus ${deleteResult.deletedCount || 0} data`)
        // Refresh the page to show empty state after a short delay
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setDeleteAllError(deleteResult.message || 'Gagal menghapus data')
      }
    } catch (error) {
      console.error('Delete all error:', error)
      setDeleteAllError(error instanceof Error ? error.message : 'Terjadi kesalahan saat menghapus data')
    } finally {
      setIsDeletingAll(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!result && (
          <>
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-[10px] p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">Template Excel</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Download template Excel untuk melihat format yang benar
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDownloadTemplate}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>

            {/* Delete All Warning */}
            {onDeleteAll && !showDeleteAllConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-900">Hapus Semua Data</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Hapus seluruh data alat yang ada sebelum import data baru. 
                      <strong className="block mt-1">Aksi ini tidak bisa dibatalkan!</strong>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteAllConfirm(true)}
                    className="shrink-0 border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus Semua
                  </Button>
                </div>
              </div>
            )}

            {/* Delete All Confirmation */}
            {showDeleteAllConfirm && (
              <div className="bg-red-100 border-2 border-red-300 rounded-[10px] p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-red-900 text-lg">Konfirmasi Penghapusan</h4>
                    <p className="text-sm text-red-800 mt-2">
                      Anda yakin ingin menghapus <strong>SELURUH</strong> data alat? 
                    </p>
                    <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                      <li>Semua data alat akan dihapus PERMANEN</li>
                      <li>Data tidak bisa dikembalikan</li>
                      <li>Pastikan sudah backup data jika diperlukan</li>
                    </ul>
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteAllConfirm(false)}
                        disabled={isDeletingAll}
                      >
                        Batal
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAll}
                        disabled={isDeletingAll}
                      >
                        {isDeletingAll ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Ya, Hapus Semua Data
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-[14px] p-8 text-center cursor-pointer transition-colors",
                isDragActive 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-muted-foreground/30 hover:border-muted-foreground/50",
                isUploading && "opacity-50 cursor-not-allowed",
                file && "border-green-500 bg-green-50"
              )}
            >
              <input {...getInputProps()} />
              
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReset()
                      }}
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Format yang didukung: .xlsx, .xls
                  </p>
                </>
              )}
            </div>

            {/* File Rejection Errors */}
            {fileRejections.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-3">
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  File tidak valid. Pastikan format file adalah Excel (.xlsx atau .xls)
                </p>
              </div>
            )}
          </>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mengimport {entityName}...</span>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={cn(
            "rounded-[10px] p-4",
            result.success 
              ? "bg-green-50 border border-green-200" 
              : result.successCount > 0 
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
          )}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={cn(
                  "font-medium",
                  result.success ? "text-green-900" : result.successCount > 0 ? "text-yellow-900" : "text-red-900"
                )}>
                  {result.success ? 'Import Berhasil!' : 'Import Selesai dengan Catatan'}
                </h4>
                <p className={cn(
                  "text-sm mt-1",
                  result.success ? "text-green-700" : result.successCount > 0 ? "text-yellow-700" : "text-red-700"
                )}>
                  {result.message}
                </p>
                
                {/* Stats */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <span className="text-muted-foreground">
                    Total: <strong>{result.totalRows}</strong> baris
                  </span>
                  <span className="text-green-600">
                    Berhasil: <strong>{result.successCount}</strong>
                  </span>
                  {result.skippedCount > 0 && (
                    <span className="text-yellow-600">
                      Dilewati: <strong>{result.skippedCount}</strong>
                    </span>
                  )}
                  {result.errorCount > 0 && (
                    <span className="text-red-600">
                      Gagal: <strong>{result.errorCount}</strong>
                    </span>
                  )}
                </div>

                {/* Error Details */}
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
                    Import {entityName}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Tutup
              </Button>
              
              {/* Undo Import Button */}
              {result.importedIds.length > 0 && onUndoImport && !isUndone && (
                <Button 
                  onClick={handleUndo} 
                  disabled={isUndoing}
                  variant="destructive"
                >
                  {isUndoing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus {result.importedIds.length} Data Import
                    </>
                  )}
                </Button>
              )}
              
              {isUndone && (
                <Button disabled variant="outline" className="text-green-600">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Data Terhapus
                </Button>
              )}
              
              {!result.success && !isUndone && (
                <Button onClick={handleReset} variant="outline">
                  Coba Lagi
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
