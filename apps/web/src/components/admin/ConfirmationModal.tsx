import { X, AlertTriangle, Loader2 } from "lucide-react";
import clsx from "clsx";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "warning" | "success";
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "warning",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const styles = {
    danger: {
      headerBg: "bg-[#ff2e2e]",
      iconColor: "text-white",
      confirmBtn: "bg-[#ff2e2e] hover:bg-red-600 text-white",
    },
    warning: {
      headerBg: "bg-brawl-yellow",
      iconColor: "text-black",
      confirmBtn: "bg-brawl-yellow hover:bg-[#bbe000] text-black",
    },
    success: {
      headerBg: "bg-green-500",
      iconColor: "text-white",
      confirmBtn: "bg-green-500 hover:bg-green-600 text-white",
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-md relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className={clsx(
            "p-3 flex justify-between items-center border-b-[4px] border-black",
            styles.headerBg,
          )}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={clsx("w-5 h-5", styles.iconColor)}
              strokeWidth={3}
            />
            <h2
              className={clsx(
                "font-black italic uppercase text-lg",
                styles.iconColor,
              )}
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="bg-black hover:bg-white hover:text-black text-white p-1 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="font-bold text-black text-sm">{description}</p>

          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-white hover:bg-gray-100 text-black py-3 font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={clsx(
                "flex-1 py-3 font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                styles.confirmBtn,
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
