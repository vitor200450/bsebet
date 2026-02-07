import { X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isDeleting?: boolean;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isDeleting = false,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-[4px] border-black shadow-[10px_10px_0px_0px_#000] w-full max-w-md relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#ff2e2e] p-3 flex justify-between items-center border-b-[4px] border-black">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" strokeWidth={3} />
            <h2 className="text-white font-black italic uppercase text-lg">
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
          <p className="text-[10px] font-black uppercase text-red-600 bg-red-50 p-2 border-2 border-red-200">
            This action cannot be undone.
          </p>

          <div className="flex gap-4 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-white hover:bg-gray-100 text-black py-3 font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 bg-[#ff2e2e] hover:bg-red-600 text-white py-3 font-black uppercase text-sm border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
