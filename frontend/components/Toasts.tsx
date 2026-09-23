"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import type { ToastDto } from "@/lib/domain/types";

const icons: Record<ToastDto["kind"], typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function Toasts({ toasts, onDismiss }: { toasts: ToastDto[]; onDismiss(id: number): void }) {
  return (
    <div className="toaster" role="status" aria-live="polite" aria-label="Уведомления">
      {toasts.map(toast => {
        const Icon = icons[toast.kind];
        return (
          <div className={`toast toast-${toast.kind}`} key={toast.id}>
            <Icon size={18} className="toastIcon" />
            <span className="toastMessage">{toast.message}</span>
            <button type="button" className="toastClose" onClick={() => onDismiss(toast.id)} aria-label="Закрыть уведомление">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}