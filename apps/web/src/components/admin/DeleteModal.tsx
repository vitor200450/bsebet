import { AlertTriangle, Loader2, X } from "lucide-react";

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
		<div className="fade-in fixed inset-0 z-[300] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
			<div className="zoom-in-95 relative w-full max-w-md animate-in border-[4px] border-black bg-white shadow-[10px_10px_0px_0px_#000] duration-200">
				{/* Header */}
				<div className="flex items-center justify-between border-black border-b-[4px] bg-[#ff2e2e] p-3">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5 text-white" strokeWidth={3} />
						<h2 className="font-black text-lg text-white uppercase italic">
							{title}
						</h2>
					</div>
					<button
						onClick={onClose}
						className="bg-black p-1 text-white transition-colors hover:bg-white hover:text-black"
					>
						<X className="h-4 w-4" strokeWidth={3} />
					</button>
				</div>

				{/* Content */}
				<div className="space-y-4 p-6">
					<p className="font-bold text-black text-sm">{description}</p>
					<p className="border-2 border-red-200 bg-red-50 p-2 font-black text-[10px] text-red-600 uppercase">
						This action cannot be undone.
					</p>

					<div className="flex gap-4 pt-2">
						<button
							onClick={onClose}
							className="flex-1 border-[3px] border-black bg-white py-3 font-black text-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						>
							Cancel
						</button>
						<button
							onClick={onConfirm}
							disabled={isDeleting}
							className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-[#ff2e2e] py-3 font-black text-sm text-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-red-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
						>
							{isDeleting ? (
								<Loader2 className="h-4 w-4 animate-spin" />
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
