import type { ReactNode } from 'react'
import { BottomSheet } from './BottomSheet'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  /** Rendered bottom-up on the sheet: primary action first. */
  actions: ReactNode
}

/**
 * A short message with its actions, as a bottom sheet.
 *
 * This is `BottomSheet` with the message/actions shape filled in; it stays a
 * separate name because that is what the confirm dialogs read as at the call
 * site.
 */
export function Modal({ open, title, children, onClose, actions }: ModalProps) {
  return (
    <BottomSheet
      open={open}
      title={title}
      onClose={onClose}
      footer={<div className="space-y-2">{actions}</div>}
    >
      <div className="pb-1 text-sm leading-relaxed text-muted">{children}</div>
    </BottomSheet>
  )
}
