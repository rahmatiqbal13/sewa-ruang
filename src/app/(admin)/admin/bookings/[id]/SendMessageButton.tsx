'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { SendMessageDialog } from '../SendMessageDialog'
import { MessageSquare } from 'lucide-react'

interface SendMessageButtonProps {
  booking: {
    id: string
    reference_no: string
    status: string
    users: {
      name: string
      email: string
      phone: string | null
      institution: string
    } | null
  }
}

export function SendMessageButton({ booking }: SendMessageButtonProps) {
  const [open, setOpen] = useState(false)

  if (!booking.users?.phone && !booking.users?.email) {
    return null
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        Kirim Pesan
      </Button>

      <SendMessageDialog
        open={open}
        onOpenChange={setOpen}
        booking={{
          ...booking,
          start_datetime: '',
          end_datetime: '',
          total_amount: 0,
        }}
      />
    </>
  )
}
