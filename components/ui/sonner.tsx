'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  const sharedToast = '!bg-zinc-900 !text-zinc-100 !border-zinc-700 !shadow-xl !opacity-100'

  return (
    <Sonner
      theme="dark"
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: sharedToast,
          title: '!text-zinc-100 !font-semibold',
          description: '!text-zinc-400 !text-sm !font-normal',
          icon: '!text-zinc-100',
          actionButton: '!bg-primary !text-primary-foreground',
          cancelButton: '!bg-zinc-800 !text-zinc-300',
          closeButton: '!bg-zinc-800 !text-zinc-400 !border-zinc-700',
          // Variant overrides — Sonner adds its own bg/text for these
          success: sharedToast,
          error: sharedToast,
          warning: sharedToast,
          info: sharedToast,
          loading: sharedToast,
        },
        style: {
          opacity: 1,
          boxShadow: '0 20px 25px -5px var(--shadow-overlay)',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
