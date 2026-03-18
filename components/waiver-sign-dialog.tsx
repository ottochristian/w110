'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WaiverSignature } from '@/components/waiver-signature'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

interface WaiverSignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waiver: {
    id: string
    title: string
    body: string
    required: boolean
  }
  athlete: {
    id: string
    first_name: string
    last_name: string
  }
  guardianId: string
  guardianName: string
  onSignatureComplete?: () => void
}

export function WaiverSignDialog({
  open,
  onOpenChange,
  waiver,
  athlete,
  guardianId,
  guardianName,
  onSignatureComplete,
}: WaiverSignDialogProps) {
  const handleSignatureComplete = () => {
    onSignatureComplete?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-5 border-b bg-card shrink-0">
          <div className="flex items-start gap-3 pr-6">
            <div className="mt-0.5 rounded-lg bg-blue-50 p-2 shrink-0">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg font-semibold leading-tight">
                  {waiver.title}
                </DialogTitle>
                {waiver.required && (
                  <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs font-medium">
                    Required
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                For {athlete.first_name} {athlete.last_name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <WaiverSignature
            waiver={waiver}
            athlete={athlete}
            guardianId={guardianId}
            guardianName={guardianName}
            onSignatureComplete={handleSignatureComplete}
            showTitle={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
