import { useEffect, useRef, useState } from "react";

export const CustomSelect = ({
	label,
	value,
	onChange,
	onConfirm,
	options,
	placeholder = "Select...",
}: {
	label: string;
	value: string;
	onChange: (val: string) => void;
	onConfirm?: (val: string) => void;
	options: { value: string; label: string }[];
	placeholder?: string;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);
	const selectedLabel = options.find((o) => o.value === value)?.label;

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setSearchTerm(""); // Reset search on close
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const filteredOptions = options.filter((opt) =>
		opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return (
		<div className="relative" ref={containerRef}>
			<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
				{label}
			</label>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex h-[50px] w-full items-center justify-between border-[3px] border-black bg-white p-3 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
			>
				<span className={!value ? "font-normal text-gray-400" : ""}>
					{selectedLabel || placeholder}
				</span>
				<span className="text-xs">▼</span>
			</button>
			{isOpen && (
				<div className="absolute top-full left-0 z-50 max-h-64 w-full overflow-y-auto border-[3px] border-black border-t-0 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<div className="sticky top-0 z-10 border-black border-b-2 bg-white p-2">
						<input
							autoFocus
							type="text"
							placeholder="SEARCH..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && filteredOptions.length > 0) {
									e.preventDefault();
									const val = filteredOptions[0].value;
									onChange(val);
									setIsOpen(false);
									setSearchTerm("");
									if (onConfirm) onConfirm(val);
								}
							}}
							className="w-full border-2 border-gray-200 p-1 font-bold text-black text-sm uppercase placeholder:text-gray-300 focus:border-black focus:outline-none"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>
					{filteredOptions.length === 0 ? (
						<div className="p-4 text-center font-bold text-gray-400 text-xs uppercase">
							No results found
						</div>
					) : (
						filteredOptions.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => {
									onChange(opt.value);
									setIsOpen(false);
									setSearchTerm("");
								}}
								className="w-full border-gray-100 border-b px-3 py-2 text-left font-bold text-black text-sm uppercase last:border-0 hover:bg-[#ccff00] hover:text-black"
							>
								{opt.label}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
};

export const CustomDatePicker = ({
	label,
	value,
	onChange,
	minDate,
	maxDate,
}: {
	label: string;
	value: string;
	onChange: (val: string) => void;
	minDate?: string; // Format: YYYY-MM-DD
	maxDate?: string; // Format: YYYY-MM-DD
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const [currentDate, setCurrentDate] = useState(
		value ? new Date(value) : new Date(),
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const daysInMonth = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth() + 1,
		0,
	).getDate();
	const firstDay = new Date(
		currentDate.getFullYear(),
		currentDate.getMonth(),
		1,
	).getDay();

	const handleDateClick = (day: number) => {
		const newDate = new Date(
			currentDate.getFullYear(),
			currentDate.getMonth(),
			day,
		);
		// Format as YYYY-MM-DD for consistency with input[type=date]
		// Use local time instead of UTC to avoid off-by-one errors in simple implementation
		const year = newDate.getFullYear();
		const month = String(newDate.getMonth() + 1).padStart(2, "0");
		const d = String(day).padStart(2, "0");
		const formatted = `${year}-${month}-${d}`;

		onChange(formatted);
		setIsOpen(false);
	};

	const changeMonth = (delta: number) => {
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1),
		);
	};

	return (
		<div className="relative" ref={containerRef}>
			<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
				{label}
			</label>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="flex h-[50px] w-full items-center justify-between border-[3px] border-black bg-white p-3 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
			>
				<span>{value || "Select Date"}</span>
				<span className="text-xs">📅</span>
			</button>

			{isOpen && (
				<div className="absolute top-full left-0 z-50 w-64 border-[3px] border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
					<div className="mb-2 flex items-center justify-between bg-black p-1 text-white">
						<button
							type="button"
							onClick={() => changeMonth(-1)}
							className="px-2 font-bold hover:text-[#ccff00]"
						>
							{"<"}
						</button>
						<span className="font-bold text-xs uppercase">
							{currentDate.toLocaleString("default", {
								month: "long",
								year: "numeric",
							})}
						</span>
						<button
							type="button"
							onClick={() => changeMonth(1)}
							className="px-2 font-bold hover:text-[#ccff00]"
						>
							{">"}
						</button>
					</div>
					<div className="mb-1 grid grid-cols-7 gap-1 text-center">
						{["S", "M", "T", "W", "T", "F", "S"].map((d) => (
							<div key={d} className="font-bold text-[10px] text-gray-400">
								{d}
							</div>
						))}
					</div>
					<div className="grid grid-cols-7 gap-1 text-center">
						{Array.from({ length: firstDay }).map((_, i) => (
							<div key={`empty-${i}`} />
						))}
						{Array.from({ length: daysInMonth }).map((_, i) => {
							const day = i + 1;

							// Check if date is within allowed range
							// Use string comparison to avoid timezone issues
							const year = currentDate.getFullYear();
							const month = String(currentDate.getMonth() + 1).padStart(2, "0");
							const dayStr = String(day).padStart(2, "0");
							const currentDateStr = `${year}-${month}-${dayStr}`;

							const isDisabled =
								(minDate && currentDateStr < minDate) ||
								(maxDate && currentDateStr > maxDate);

							// Simple equality check
							const isSelected =
								value &&
								Number.parseInt(value.split("-")[2]) === day &&
								Number.parseInt(value.split("-")[1]) ===
									currentDate.getMonth() + 1 &&
								Number.parseInt(value.split("-")[0]) ===
									currentDate.getFullYear();
							return (
								<button
									key={day}
									type="button"
									onClick={() => !isDisabled && handleDateClick(day)}
									disabled={!!isDisabled}
									className={`rounded-sm p-1 font-bold text-xs ${
										isDisabled
											? "cursor-not-allowed text-gray-300"
											: "hover:bg-[#ccff00] hover:text-black"
									} ${isSelected ? "bg-black text-white" : "text-black"}`}
								>
									{day}
								</button>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
};

export const CustomTimePicker = ({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (val: string) => void;
}) => {
	return (
		<div>
			<label className="mb-1 ml-1 block font-black text-black text-xs uppercase">
				{label}
			</label>
			<div className="relative">
				<input
					type="time"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="h-[42px] w-full border-[3px] border-black bg-white p-2 font-bold text-black focus:outline-none focus:ring-4 focus:ring-[#ccff00]"
				/>
				<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 bg-white pl-1 text-xs">
					⏰
				</span>
			</div>
		</div>
	);
};
