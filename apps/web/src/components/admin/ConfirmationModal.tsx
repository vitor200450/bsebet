import clsx from "clsx";
import { AlertTriangle, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { InlineLoader } from "@/components/inline-loader";
import { useModalPresence } from "@/hooks/useModalPresence";

function matchesChallengeText(input: string, challengeText: string): boolean {
	return (
		input.trim().toLocaleLowerCase() ===
		challengeText.trim().toLocaleLowerCase()
	);
}

interface ConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	description?: string;
	children?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	isLoading?: boolean;
	variant?: "danger" | "warning" | "success";
	hideDefaultActions?: boolean;
	/** When set, confirm stays disabled until the admin types this text (case-insensitive). */
	challengeText?: string;
}

export function ConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	children,
	confirmLabel: confirmLabelProp,
	cancelLabel: cancelLabelProp,
	isLoading = false,
	variant = "warning",
	hideDefaultActions = false,
	challengeText,
}: ConfirmationModalProps) {
	const { t } = useTranslation(["admin-matches", "common"]);
	const confirmLabel = confirmLabelProp ?? t("confirmation.confirm");
	const cancelLabel = cancelLabelProp ?? t("confirmation.cancel");
	const { present, visible, exiting } = useModalPresence(isOpen);
	const [challengeInput, setChallengeInput] = useState("");
	const challengeInputRef = useRef<HTMLInputElement>(null);
	const challengeInputId = useId();

	const challengeRequired = typeof challengeText === "string";
	const challengeMet =
		!challengeRequired ||
		(challengeText.trim().length > 0 &&
			matchesChallengeText(challengeInput, challengeText));
	const confirmDisabled = isLoading || exiting || !challengeMet;

	useEffect(() => {
		if (!isOpen) {
			setChallengeInput("");
		}
	}, [isOpen]);

	useEffect(() => {
		if (!present) return;
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [present]);

	useEffect(() => {
		if (!isOpen || isLoading) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [isOpen, isLoading, onClose]);

	useEffect(() => {
		if (!isOpen || !challengeRequired || !visible) return;
		const frame = requestAnimationFrame(() => {
			challengeInputRef.current?.focus();
		});
		return () => cancelAnimationFrame(frame);
	}, [isOpen, challengeRequired, visible]);

	if (!present) return null;

	const styles = {
		danger: {
			headerBg: "bg-brawl-red",
			iconColor: "text-white",
			confirmBtn: "bg-brawl-red hover:bg-red-600 text-white",
		},
		warning: {
			headerBg: "bg-brawl-yellow",
			iconColor: "text-black",
			confirmBtn: "bg-brawl-yellow hover:bg-[#bbe000] text-black",
		},
		success: {
			headerBg: "bg-electric-lime",
			iconColor: "text-black",
			confirmBtn: "bg-electric-lime hover:bg-[#bbe000] text-black",
		},
	}[variant];

	const handleConfirm = () => {
		if (confirmDisabled) return;
		onConfirm();
	};

	return (
		<div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
			<button
				type="button"
				className="admin-modal-overlay absolute inset-0 bg-black/60"
				aria-label={t("common:actions.close")}
				onClick={onClose}
				disabled={exiting || isLoading}
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			/>
			<div
				role="dialog"
				aria-modal="true"
				className="admin-modal-panel relative w-full max-w-md border-[4px] border-black bg-white text-ink shadow-[10px_10px_0px_0px_#000]"
				data-open={visible ? "true" : undefined}
				data-exiting={exiting ? "true" : undefined}
			>
				<div
					className={clsx(
						"flex items-center justify-between border-black border-b-[4px] p-3",
						styles.headerBg,
					)}
				>
					<div className="flex min-w-0 items-center gap-2">
						<AlertTriangle
							className={clsx("h-5 w-5 shrink-0", styles.iconColor)}
							strokeWidth={3}
						/>
						<h2
							className={clsx(
								"pr-1.5 font-black font-display text-lg uppercase italic leading-[1.1]",
								styles.iconColor,
							)}
						>
							{title}
						</h2>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={exiting || isLoading}
						className="admin-press shrink-0 bg-black p-1 text-white hover:bg-white hover:text-black disabled:opacity-50"
						aria-label={t("common:actions.close")}
					>
						<X className="h-4 w-4" strokeWidth={3} />
					</button>
				</div>

				<div className="space-y-4 p-6">
					{children ??
						(description ? (
							<p className="font-body font-bold text-black text-sm">
								{description}
							</p>
						) : null)}

					{challengeRequired && challengeText ? (
						<div className="space-y-2">
							<label
								htmlFor={challengeInputId}
								className="block font-body font-bold text-black text-xs uppercase tracking-widest"
							>
								{t("confirmation.challengePrompt", { name: challengeText })}
							</label>
							<input
								ref={challengeInputRef}
								id={challengeInputId}
								type="text"
								value={challengeInput}
								onChange={(e) => setChallengeInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										handleConfirm();
									}
								}}
								disabled={isLoading || exiting}
								autoComplete="off"
								autoCorrect="off"
								spellCheck={false}
								className="surface-white w-full border-[3px] border-black p-3 font-black font-display shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:font-black placeholder:font-display placeholder:text-gray-400 focus:border-black focus:outline-none focus:ring-4 focus:ring-electric-lime disabled:opacity-50"
								placeholder={challengeText}
							/>
						</div>
					) : null}

					{!hideDefaultActions && (
						<div className="flex gap-4 pt-2">
							<button
								type="button"
								onClick={onClose}
								disabled={isLoading || exiting}
								className="admin-press-comic flex-1 border-[3px] border-black bg-white py-3 font-black font-display text-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-100 disabled:opacity-50"
							>
								{cancelLabel}
							</button>
							<button
								type="button"
								onClick={handleConfirm}
								disabled={confirmDisabled}
								className={clsx(
									"admin-press-comic flex flex-1 items-center justify-center gap-2 border-[3px] border-black py-3 font-black font-display text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50",
									styles.confirmBtn,
								)}
							>
								{isLoading ? <InlineLoader size="sm" /> : confirmLabel}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
