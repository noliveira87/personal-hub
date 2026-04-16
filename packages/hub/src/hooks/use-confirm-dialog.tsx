import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const DEFAULT_OPTIONS: Required<Pick<ConfirmDialogOptions, "confirmLabel" | "cancelLabel" | "destructive">> = {
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  destructive: true,
};

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const resolveAndClose = useCallback((value: boolean) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
    setOpen(false);
    setOptions(null);
  }, []);

  const confirm = useCallback((input: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(input);
      setOpen(true);
    });
  }, []);

  const confirmDialog = (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resolveAndClose(false);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description ? (
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{options?.cancelLabel ?? DEFAULT_OPTIONS.cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => resolveAndClose(true)}
            className={options?.destructive ?? DEFAULT_OPTIONS.destructive
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : undefined}
          >
            {options?.confirmLabel ?? DEFAULT_OPTIONS.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, confirmDialog };
}
