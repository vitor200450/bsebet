import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared product canvas: crumpled paper fill (same asset as landing paper zones).
 * Texture scrolls with the page — not fixed to the viewport.
 */
export function PublicPageShell({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn("page-canvas", className)}>{children}</div>;
}
