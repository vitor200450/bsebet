export default function Loader() {
	return (
		<div className="flex min-h-[80dvh] w-full items-center justify-center bg-paper bg-paper-texture p-6">
			<div className="flex flex-col items-center gap-5">
				{/* Bouncing VS-style loader — broadcast energy */}
				<div className="flex items-center gap-3">
					<div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-brawl-blue shadow-[4px_4px_0_0_#000]">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
					</div>
					<div className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black bg-brawl-red shadow-[4px_4px_0_0_#000]">
						<div className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
					</div>
				</div>
				<div className="-skew-x-6 transform rounded-md border-[3px] border-black bg-ink px-5 py-2.5 shadow-[4px_4px_0_0_#000]">
					<span className="animate-pulse font-black font-display text-[#ccff00] text-xs uppercase italic tracking-[0.15em]">
						CARREGANDO...
					</span>
				</div>
			</div>
		</div>
	);
}
