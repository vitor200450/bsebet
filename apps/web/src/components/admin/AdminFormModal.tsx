import { X } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { InlineLoader } from "@/components/inline-loader";
import { useModalPresence } from "@/hooks/useModalPresence";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
	sm: "max-w-md",
	md: "max-w-2xl",
	lg: "max-w-4xl",
	xl: "max-w-5xl",
} as const;

const HEADER_VARIANT = {
	blue: {
		bar: "surface-brawl-blue",
		title: "text-white",
		close:
			"admin-press border-2 border-white bg-black p-1.5 text-white hover:bg-brawl-red disabled:opacity-50",
	},
	lime: {
		bar: "bg-electric-lime text-ink",
		title: "text-ink",
		close:
			"admin-press border-2 border-black bg-black p-1.5 text-white hover:bg-brawl-red disabled:opacity-50",
	},
} as const;

interface AdminFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	headerActions?: ReactNode;
	titleExtra?: ReactNode;
	onSubmit?: (e: FormEvent) => void;
	size?: keyof typeof SIZE_CLASS;
	formId?: string;
	zIndexClassName?: string;
	headerVariant?: keyof typeof HEADER_VARIANT;
	closeDisabled?: boolean;
}

export function AdminFormModal({
	isOpen,
	onClose,
	title,
	children,
	footer,
	headerActions,
	titleExtra,
	onSubmit,
	size = "md",
	formId = "admin-form-modal",
	zIndexClassName = "z-[100]",
	headerVariant = "blue",
	closeDisabled = false,
}: AdminFormModalProps) {
	const { t } = useTranslation("common");
	const header = HEADER_VARIANT[headerVariant];
	const { present, visible, exiting } = useModalPresence(isOpen);

	useEffect(() => {
		if (!isOpen || closeDisabled) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose, closeDisabled]);

	useEffect(() => {
		if (!present) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [present]);

	if (!present) return null;

	const body = (
		<>
			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
				{children}
			</div>
			{footer ? (
				<div className="shrink-0 border-black border-t-[3px] bg-paper px-5 py-4 sm:px-6">
					{footer}
				</div>
			) : null}
		</>
	);

	return (
		<div
			className={cn(
				"fixed inset-0 flex items-center justify-center p-3 sm:p-4",
				zIndexClassName,
			)}
		>
			<button
				type="button"
				className="admin-modal-overlay absolute inset-0 bg-black/60 disabled:cursor-not-allowed"
				aria-label={t("actions.close")}
				onClick={onClose}
				disabled={closeDisabled || exiting}
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={`${formId}-title`}
				className={cn(
					"admin-modal-panel relative flex max-h-[min(92vh,900px)] w-full flex-col overflow-hidden border-[4px] border-black bg-white text-ink shadow-[10px_10px_0px_0px_#000]",
					SIZE_CLASS[size],
				)}
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			>
				<div
					className={cn(
						"flex shrink-0 items-center justify-between gap-3 border-black border-b-[4px] px-4 py-3 sm:px-5",
						header.bar,
					)}
				>
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<h2
							id={`${formId}-title`}
							className={cn(
								"min-w-0 pr-1.5 font-black font-display text-lg uppercase italic leading-[1.1] tracking-tight sm:text-xl",
								header.title,
							)}
						>
							{title}
						</h2>
						{titleExtra}
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{headerActions}
						<button
							type="button"
							onClick={onClose}
							disabled={closeDisabled || exiting}
							className={header.close}
							aria-label={t("actions.close")}
						>
							{closeDisabled ? (
								<InlineLoader size="sm" />
							) : (
								<X className="h-5 w-5" strokeWidth={3} />
							)}
						</button>
					</div>
				</div>

				{onSubmit ? (
					<form
						id={formId}
						onSubmit={onSubmit}
						className="flex min-h-0 flex-1 flex-col"
					>
						{body}
					</form>
				) : (
					<div className="flex min-h-0 flex-1 flex-col">{body}</div>
				)}
			</div>
		</div>
	);
}

interface AdminFormActionsProps {
	onCancel: () => void;
	cancelLabel: string;
	submitLabel: string;
	savingLabel?: string;
	isSubmitting?: boolean;
	submitIcon?: ReactNode;
	submitClassName?: string;
	hideCancel?: boolean;
}

export function AdminFormActions({
	onCancel,
	cancelLabel,
	submitLabel,
	savingLabel,
	isSubmitting = false,
	submitIcon,
	submitClassName,
	hideCancel = false,
}: AdminFormActionsProps) {
	return (
		<div className="flex gap-3">
			{!hideCancel && (
				<button
					type="button"
					onClick={onCancel}
					disabled={isSubmitting}
					className="admin-press flex-1 border-[3px] border-transparent py-3 font-black font-display text-gray-500 text-sm uppercase hover:bg-white hover:text-ink disabled:opacity-50"
				>
					{cancelLabel}
				</button>
			)}
			<button
				type="submit"
				disabled={isSubmitting}
				className={cn(
					"admin-press-comic flex items-center justify-center gap-2 border-[3px] border-black bg-electric-lime py-3 font-black font-display text-base text-ink uppercase italic shadow-[4px_4px_0px_0px_#000] hover:bg-[#bbe000] disabled:cursor-not-allowed disabled:opacity-70 sm:text-lg",
					hideCancel ? "w-full" : "flex-[2]",
					submitClassName,
				)}
			>
				{isSubmitting ? <InlineLoader size="md" /> : (submitIcon ?? null)}
				{isSubmitting ? (savingLabel ?? submitLabel) : submitLabel}
			</button>
		</div>
	);
}
