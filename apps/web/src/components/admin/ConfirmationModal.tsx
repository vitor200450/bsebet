import clsx from "clsx";
import { AlertTriangle, Loader2, X } from "lucide-react";

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
		<div className="fade-in fixed inset-0 z-[300] flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
			<div className="zoom-in-95 relative w-full max-w-md animate-in border-[4px] border-black bg-white shadow-[10px_10px_0px_0px_#000] duration-200">
				{/* Header */}
				<div
					className={clsx(
						"flex items-center justify-between border-black border-b-[4px] p-3",
						styles.headerBg,
					)}
				>
					<div className="flex items-center gap-2">
						<AlertTriangle
							className={clsx("h-5 w-5", styles.iconColor)}
							strokeWidth={3}
						/>
						<h2
							className={clsx(
								"font-black text-lg uppercase italic",
								styles.iconColor,
							)}
						>
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

					<div className="flex gap-4 pt-2">
						<button
							onClick={onClose}
							disabled={isLoading}
							className="flex-1 border-[3px] border-black bg-white py-3 font-black text-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-gray-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
						>
							{cancelLabel}
						</button>
						<button
							onClick={onConfirm}
							disabled={isLoading}
							className={clsx(
								"flex flex-1 items-center justify-center gap-2 border-[3px] border-black py-3 font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50",
								styles.confirmBtn,
							)}
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
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
