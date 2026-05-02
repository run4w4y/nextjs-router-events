'use client'

import { observer } from 'mobx-react-lite'
import '@/lib/mobx-static-rendering'
import { useTodoStore } from '@/features/todos/todo-store-provider'
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useLeaveConfirmation } from './use-leave-confirmation'

const sourceCopy: Record<string, string> = {
  anchor: 'internal link',
  'router.push': 'router.push',
  'router.replace': 'router.replace',
  'router.back': 'router.back',
  'router.forward': 'router.forward',
  popstate: 'browser history',
  'external-link': 'external link',
  'document-link': 'full document link',
}

export const UnsavedChangesDialog = observer(function UnsavedChangesDialog() {
  const store = useTodoStore()
  const { pendingLeave, cancelLeave, confirmLeave } = useLeaveConfirmation({
    shouldPreventLeave: store.isDraftDirty,
    onConfirmLeave: () => store.resetDraft(),
  })

  return (
    <AlertDialog open={Boolean(pendingLeave)}>
      <AlertDialogContent data-testid="unsaved-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Your todo draft has unsaved changes. If you leave now, the draft will be discarded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {pendingLeave ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            Pending {sourceCopy[pendingLeave.source]} to{' '}
            <span className="font-mono text-foreground">{pendingLeave.targetUrl}</span>
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancelButton onClick={cancelLeave} data-testid="stay-on-page">
            Stay here
          </AlertDialogCancelButton>
          <AlertDialogActionButton onClick={confirmLeave} data-testid="discard-and-leave">
            Discard and leave
          </AlertDialogActionButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
})
