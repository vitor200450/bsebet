import type { ReactNode } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";
import { InlineLoader } from "@/components/inline-loader";
import { cn } from "@/lib/utils";

type ToastTone = "lime" | "red" | "yellow" | "blue" | "ink";

const TONE_SURFACE: Record<ToastTone, string> = {
	lime: "surface-lime",
	red: "surface-bsen-red",
	yellow: "surface-yellow",
	blue: "surface-brawl-blue",
	ink: "surface-ink",
};

function ToastTypeIcon({
	tone,
	children,
}: {
	tone: ToastTone;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				"bsen-toast-mark inline-flex size-8 shrink-0 -skew-x-6 items-center justify-center border-2 border-black shadow-comic-press",
				TONE_SURFACE[tone],
			)}
			aria-hidden
		>
			<span className="inline-flex skew-x-6 items-center justify-center">
				{children}
			</span>
		</span>
	);
}

const iconClassName = "size-4 stroke-[2.5]";

const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			theme="light"
			position="bottom-right"
			closeButton
			gap={12}
			offset={20}
			className="toaster group bsen-toaster"
			icons={{
				success: (
					<ToastTypeIcon tone="lime">
						<Check className={iconClassName} />
					</ToastTypeIcon>
				),
				error: (
					<ToastTypeIcon tone="red">
						<X className={iconClassName} />
					</ToastTypeIcon>
				),
				warning: (
					<ToastTypeIcon tone="yellow">
						<AlertTriangle className={iconClassName} />
					</ToastTypeIcon>
				),
				info: (
					<ToastTypeIcon tone="blue">
						<Info className={iconClassName} />
					</ToastTypeIcon>
				),
				loading: (
					<ToastTypeIcon tone="ink">
						<InlineLoader size="xs" />
					</ToastTypeIcon>
				),
			}}
			toastOptions={{
				classNames: {
					toast: "bsen-toast",
					title: "bsen-toast-title",
					description: "bsen-toast-description",
					actionButton: "bsen-toast-action",
					cancelButton: "bsen-toast-cancel",
					closeButton: "bsen-toast-close",
					success: "bsen-toast--success",
					error: "bsen-toast--error",
					warning: "bsen-toast--warning",
					info: "bsen-toast--info",
					loading: "bsen-toast--loading",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
