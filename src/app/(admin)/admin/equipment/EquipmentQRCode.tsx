'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { QrCode, Download, Share2, Printer } from 'lucide-react'

interface EquipmentQRCodeProps {
  equipmentId: string
  equipmentName: string
  equipmentCode?: string | null
}

export function EquipmentQRCode({ equipmentId, equipmentName, equipmentCode }: EquipmentQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && equipmentId) {
      // Generate QR code with equipment scan URL
      const scanUrl = `${window.location.origin}/assets/${equipmentId}/scan`
      
      QRCode.toDataURL(scanUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then((url: string) => {
          setQrDataUrl(url)
        })
        .catch((err: Error) => {
          console.error('Failed to generate QR code:', err)
        })
    }
  }, [isOpen, equipmentId])

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement('a')
      link.href = qrDataUrl
      link.download = `qr-${equipmentCode || equipmentId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handlePrint = () => {
    if (qrDataUrl) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${equipmentName}</title>
              <style>
                body { 
                  display: flex; 
                  flex-direction: column;
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  margin: 0;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                .container {
                  text-align: center;
                  padding: 40px;
                  border: 2px dashed #ccc;
                  border-radius: 12px;
                }
                img { 
                  max-width: 300px; 
                  margin-bottom: 20px;
                }
                h1 { 
                  font-size: 24px; 
                  margin-bottom: 8px;
                  color: #333;
                }
                p { 
                  font-size: 14px; 
                  color: #666;
                  margin: 4px 0;
                }
                .code {
                  font-family: monospace;
                  background: #f3f4f6;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 16px;
                  margin-top: 8px;
                }
                @media print {
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="container">
                <img src="${qrDataUrl}" alt="QR Code" />
                <h1>${equipmentName}</h1>
                ${equipmentCode ? `<p class="code">${equipmentCode}</p>` : ''}
                <p>Scan untuk melihat detail alat</p>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button variant="outline" size="sm" type="button">
          <QrCode className="h-4 w-4 mr-2" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Alat
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          {qrDataUrl ? (
            <>
              <div className="bg-white p-6 rounded-xl border-2 border-dashed border-slate-200">
                <img 
                  src={qrDataUrl} 
                  alt="QR Code" 
                  className="w-64 h-64"
                />
              </div>
              
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-900">{equipmentName}</p>
                {equipmentCode && (
                  <p className="text-sm font-mono text-slate-500">{equipmentCode}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Scan untuk melihat detail dan status alat
                </p>
              </div>

              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </>
          ) : (
            <div className="w-64 h-64 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center">
              <QrCode className="h-12 w-12 text-slate-300" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
