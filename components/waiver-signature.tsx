'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle, PenLine } from 'lucide-react'
import { useSignWaiver, useAthleteWaiverStatus } from '@/lib/hooks/use-waivers'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface WaiverSignatureProps {
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
  showTitle?: boolean
}

export function WaiverSignature({
  waiver,
  athlete,
  guardianId,
  guardianName,
  onSignatureComplete,
  showTitle = true,
}: WaiverSignatureProps) {
  const [agreed, setAgreed] = useState(false)
  const [typedName, setTypedName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const signWaiver = useSignWaiver()
  const { data: waiverStatus } = useAthleteWaiverStatus(athlete.id)

  const isSigned = waiverStatus?.find(
    (status: any) => status.waiver_id === waiver.id && status.status === 'signed'
  )

  const athleteFullName = `${athlete.first_name} ${athlete.last_name}`
  const nameMatches = typedName.trim().toLowerCase() === guardianName.trim().toLowerCase()
  const canSign = agreed && typedName.trim() && nameMatches

  const handleSign = async () => {
    if (!agreed) {
      toast.error('Please check the agreement box to continue')
      return
    }
    if (!nameMatches) {
      toast.error(`Please type your full name exactly: ${guardianName}`)
      return
    }

    setIsSubmitting(true)
    try {
      await signWaiver.mutateAsync({
        waiverId: waiver.id,
        athleteId: athlete.id,
        guardianId,
        signedName: typedName.trim(),
      })
      toast.success('Waiver signed successfully')
      setAgreed(false)
      setTypedName('')
      onSignatureComplete?.()
    } catch (error) {
      toast.error('Failed to sign waiver')
      console.error('Sign waiver error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSigned) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <p className="text-base font-semibold text-green-800">Waiver Signed</p>
          <p className="mt-1 text-sm text-green-700">
            Signed for {athleteFullName} on{' '}
            {new Date(isSigned.signed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {showTitle && (
        <div className="px-6 pt-5 pb-4 border-b">
          <h3 className="text-base font-semibold">{waiver.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Please read and sign for {athleteFullName}
          </p>
        </div>
      )}

      {/* Waiver body */}
      <div className="px-6 py-5 border-b bg-card overflow-y-auto" style={{ maxHeight: '38vh' }}>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
          {waiver.body}
        </div>
      </div>

      {/* Signature section */}
      <div className="px-6 py-5 space-y-5 bg-card">
        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer group">
          <Checkbox
            id={`agree-${waiver.id}-${athlete.id}`}
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            className="mt-0.5 shrink-0"
          />
          <span className="text-sm text-foreground group-hover:text-foreground transition-colors leading-snug">
            I, <strong>{guardianName}</strong>, have read and agree to the terms of this waiver on behalf of{' '}
            <strong>{athleteFullName}</strong>, and accept full responsibility as described above.
          </span>
        </label>

        {/* Guardian name confirmation */}
        <div className="space-y-2">
          <Label htmlFor={`name-${waiver.id}-${athlete.id}`} className="text-sm font-medium">
            Type your full name to sign
          </Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Sign as: <strong>{guardianName}</strong>
          </p>
          <div className="relative">
            <PenLine className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id={`name-${waiver.id}-${athlete.id}`}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={guardianName}
              className={cn(
                'pl-9',
                typedName && !nameMatches && 'border-red-300 focus-visible:ring-red-300',
                typedName && nameMatches && 'border-green-400 focus-visible:ring-green-300',
              )}
            />
          </div>
          {typedName && !nameMatches && (
            <p className="text-xs text-red-600">
              Must match exactly: <strong>{guardianName}</strong>
            </p>
          )}
          {typedName && nameMatches && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> Signature confirmed
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSign}
          disabled={!canSign || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Signing…' : `Sign Waiver for ${athlete.first_name}`}
        </Button>

        {waiver.required && (
          <p className="text-xs text-muted-foreground text-center">
            This waiver must be signed before completing registration
          </p>
        )}
      </div>
    </div>
  )
}
