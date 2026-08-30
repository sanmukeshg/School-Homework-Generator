import { Modal } from './Modal'

interface ConfirmSheetProps {
  open: boolean
  title: string
  message: string
  /** Label for the destructive action. */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Destructive confirmation as a bottom sheet. Used instead of window.confirm,
 * which browsers may suppress inside an installed PWA.
 */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel
}: ConfirmSheetProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      actions={
        <>
          <button type="button" onClick={onConfirm} className="btn-danger w-full">
            {confirmLabel}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost w-full">
            Cancel
          </button>
        </>
      }
    >
      {message}
    </Modal>
  )
}
