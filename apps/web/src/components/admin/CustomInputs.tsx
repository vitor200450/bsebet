import { Combobox } from "@base-ui/react/combobox";
import { Popover } from "@base-ui/react/popover";
import {
	Calendar,
	Check,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Search,
} from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { InlineLoader } from "@/components/inline-loader";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const fieldLabelClass =
	"mb-1 ml-1 block font-body font-bold text-ink text-xs uppercase tracking-widest";

/** Base trigger chrome; size variants supply height/shadow */
const fieldTriggerClass =
	"flex w-full items-center justify-between gap-2 border-[3px] border-black bg-white font-bold text-black outline-none transition-all focus-visible:ring-4 focus-visible:ring-electric-lime/40 data-popup-open:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";

const popupPanelClass =
	"origin-(--transform-origin) overflow-hidden border-[3px] border-black bg-white text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none max-h-(--available-height)";

export const CustomSelect = ({
	label,
	value,
	onChange,
	onConfirm,
	options,
	placeholder: placeholderProp,
	searchable = true,
	size = "default",
	className,
	triggerClassName,
}: {
	label?: string;
	value: string;
	onChange: (val: string) => void;
	onConfirm?: (val: string) => void;
	options: SelectOption[];
	placeholder?: string;
	searchable?: boolean;
	size?: "default" | "compact" | "toolbar";
	className?: string;
	triggerClassName?: string;
}) => {
	const { t } = useTranslation("admin-matches");
	const placeholder = placeholderProp ?? t("customInputs.selectPlaceholder");
	const confirmOnNextChange = useRef(false);

	const selected = useMemo(
		() => options.find((option) => option.value === value) ?? null,
		[options, value],
	);

	const sizeClasses =
		size === "toolbar"
			? "h-11 px-4 font-body text-sm uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
			: size === "compact"
				? "h-8 px-2 font-display text-[10px] uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]"
				: "min-h-[50px] px-3 py-3 font-display shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]";

	const iconSize = size === "compact" ? "size-3" : "size-4";
	const itemPadding =
		size === "compact"
			? "px-2 py-1.5 text-[10px]"
			: size === "toolbar"
				? "px-4 py-2.5 text-xs"
				: "px-3 py-2.5 text-sm";

	return (
		<Combobox.Root
			items={options}
			value={selected}
			onValueChange={(next) => {
				if (!next) {
					confirmOnNextChange.current = false;
					onChange("");
					return;
				}
				onChange(next.value);
				if (confirmOnNextChange.current) {
					confirmOnNextChange.current = false;
					onConfirm?.(next.value);
				}
			}}
			isItemEqualToValue={(a, b) => a.value === b.value}
			autoHighlight={searchable}
			filter={searchable ? undefined : null}
		>
			<div className={cn("flex w-full flex-col", className)}>
				{label ? <span className={fieldLabelClass}>{label}</span> : null}
				<Combobox.Trigger
					type="button"
					className={cn(fieldTriggerClass, sizeClasses, triggerClassName)}
				>
					<Combobox.Value
						placeholder={
							<span className="truncate font-normal text-gray-400">
								{placeholder}
							</span>
						}
					>
						{(item: SelectOption | null) => (
							<span className="truncate">{item?.label}</span>
						)}
					</Combobox.Value>
					<Combobox.Icon className="shrink-0 text-black">
						<ChevronDown className={iconSize} strokeWidth={3} aria-hidden />
					</Combobox.Icon>
				</Combobox.Trigger>
			</div>

			<Combobox.Portal>
				<Combobox.Positioner
					className="isolate z-[300] outline-none"
					side="bottom"
					align="start"
					sideOffset={0}
					collisionPadding={8}
				>
					<Combobox.Popup
						className={cn(popupPanelClass, "w-(--anchor-width) min-w-48")}
					>
						{searchable ? (
							<div className="border-black border-b-2 bg-white p-2">
								<Combobox.Input
									placeholder={t("customInputs.searchPlaceholder")}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault();
											if (onConfirm) {
												confirmOnNextChange.current = true;
											}
										}
									}}
									className="w-full border-2 border-tape bg-white p-2 font-body font-bold text-black text-sm uppercase tracking-widest placeholder:font-body placeholder:text-gray-400 focus:border-black focus:outline-none"
								/>
							</div>
						) : null}
						<Combobox.Empty className="p-4 text-center font-body font-bold text-gray-400 text-xs uppercase tracking-widest">
							{t("customInputs.noResults")}
						</Combobox.Empty>
						<Combobox.List className="max-h-48 overflow-y-auto overscroll-contain outline-none">
							{(option: SelectOption) => (
								<Combobox.Item
									key={option.value}
									value={option}
									className={cn(
										"flex w-full cursor-pointer items-center justify-between gap-2 border-tape border-b text-left font-bold font-display text-black uppercase outline-none last:border-0 data-selected:data-highlighted:bg-electric-lime data-selected:data-highlighted:text-ink data-highlighted:bg-electric-lime data-selected:bg-ink data-highlighted:text-ink data-selected:text-white",
										itemPadding,
									)}
								>
									<span className="truncate">{option.label}</span>
									<Combobox.ItemIndicator className="shrink-0">
										<Check className={iconSize} strokeWidth={3} aria-hidden />
									</Combobox.ItemIndicator>
								</Combobox.Item>
							)}
						</Combobox.List>
					</Combobox.Popup>
				</Combobox.Positioner>
			</Combobox.Portal>
		</Combobox.Root>
	);
};

export type AsyncSearchItem = {
	id: string;
	title: string;
	subtitle?: string;
	imageUrl?: string | null;
};

export const CustomAsyncSearch = <T extends AsyncSearchItem>({
	query,
	onQueryChange,
	results,
	isLoading = false,
	open,
	onOpenChange,
	onSelect,
	placeholder,
	emptyMessage,
	minQueryLength = 2,
	renderLeading,
}: {
	query: string;
	onQueryChange: (query: string) => void;
	results: T[];
	isLoading?: boolean;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (item: T) => void;
	placeholder?: string;
	emptyMessage?: string;
	minQueryLength?: number;
	renderLeading?: (item: T) => ReactNode;
}) => {
	const { t } = useTranslation("admin-matches");
	const inputId = useId();
	const anchorRef = useRef<HTMLDivElement>(null);
	const showEmpty =
		open &&
		query.length >= minQueryLength &&
		!isLoading &&
		results.length === 0;
	const showResults = open && results.length > 0;

	return (
		<Popover.Root
			open={open && (showResults || showEmpty || isLoading)}
			onOpenChange={(next) => {
				if (!next) onOpenChange(false);
			}}
		>
			<div ref={anchorRef} className="relative w-full">
				<Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400" />
				<input
					id={inputId}
					type="text"
					value={query}
					placeholder={placeholder}
					onChange={(event) => {
						onQueryChange(event.target.value);
						onOpenChange(true);
					}}
					onFocus={() => {
						if (query.length >= minQueryLength) onOpenChange(true);
					}}
					className="w-full border-[3px] border-black bg-white p-3 pl-10 font-bold font-display text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus-visible:ring-4 focus-visible:ring-electric-lime"
				/>
				{isLoading ? (
					<span className="absolute top-1/2 right-3 -translate-y-1/2">
						<InlineLoader size="md" />
					</span>
				) : null}
			</div>

			<Popover.Portal>
				<Popover.Positioner
					className="isolate z-[300] outline-none"
					side="bottom"
					align="start"
					sideOffset={8}
					collisionPadding={8}
					anchor={anchorRef}
				>
					<Popover.Popup
						className={cn(popupPanelClass, "w-(--anchor-width)")}
						aria-label={placeholder ?? t("customInputs.searchPlaceholder")}
					>
						{showResults ? (
							<div className="max-h-60 overflow-y-auto overscroll-contain">
								{results.map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => {
											onSelect(item);
											onOpenChange(false);
										}}
										className="flex w-full items-center gap-3 border-tape border-b p-3 text-left outline-none last:border-b-0 hover:bg-electric-lime/20 focus-visible:bg-electric-lime/20"
									>
										{renderLeading ? (
											renderLeading(item)
										) : item.imageUrl ? (
											<img
												src={item.imageUrl}
												alt=""
												className="size-8 shrink-0 rounded-full border-2 border-ink object-cover"
											/>
										) : (
											<div className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-tape text-ink">
												<Search className="size-4" aria-hidden />
											</div>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate font-bold font-display text-ink text-sm">
												{item.title}
											</p>
											{item.subtitle ? (
												<p className="truncate font-body font-bold text-gray-500 text-xs tracking-wide">
													{item.subtitle}
												</p>
											) : null}
										</div>
									</button>
								))}
							</div>
						) : null}

						{showEmpty ? (
							<div className="p-4 text-center font-body font-bold text-gray-500 text-sm tracking-wide">
								{emptyMessage ?? t("customInputs.noResults")}
							</div>
						) : null}

						{isLoading && results.length === 0 ? (
							<div className="flex items-center justify-center p-4">
								<InlineLoader size="md" />
							</div>
						) : null}
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};

export const CustomDatePicker = ({
	label,
	value,
	onChange,
	minDate,
	maxDate,
}: {
	label?: string;
	value: string;
	onChange: (val: string) => void;
	minDate?: string;
	maxDate?: string;
}) => {
	const { t, i18n } = useTranslation("admin-matches");
	const locale = i18n.language === "pt" ? "pt-BR" : "en-US";
	const [open, setOpen] = useState(false);
	const [currentDate, setCurrentDate] = useState(
		value ? new Date(value) : new Date(),
	);

	useEffect(() => {
		if (!value) return;
		const parsed = new Date(value);
		if (!Number.isNaN(parsed.getTime())) {
			setCurrentDate(parsed);
		}
	}, [value]);

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

	const displayValue = useMemo(() => {
		if (!value) return null;
		const parsed = new Date(`${value}T12:00:00`);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleDateString(locale, {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	}, [value, locale]);

	const handleDateClick = (day: number) => {
		const year = currentDate.getFullYear();
		const month = String(currentDate.getMonth() + 1).padStart(2, "0");
		const d = String(day).padStart(2, "0");
		onChange(`${year}-${month}-${d}`);
		setOpen(false);
	};

	const changeMonth = (delta: number) => {
		setCurrentDate(
			new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1),
		);
	};

	const dayHeaders = t("customInputs.dayHeaders", {
		returnObjects: true,
	}) as string[];

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<div className="flex w-full flex-col">
				{label ? <span className={fieldLabelClass}>{label}</span> : null}
				<Popover.Trigger
					type="button"
					className={cn(
						fieldTriggerClass,
						"min-h-[50px] px-3 py-3 font-display shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)]",
					)}
				>
					<span
						className={cn("truncate", !value && "font-normal text-gray-400")}
					>
						{displayValue ?? t("customInputs.selectDate")}
					</span>
					<Calendar
						className="size-4 shrink-0 text-black"
						strokeWidth={2.5}
						aria-hidden
					/>
				</Popover.Trigger>
			</div>

			<Popover.Portal>
				<Popover.Positioner
					className="isolate z-[300] outline-none"
					side="bottom"
					align="start"
					sideOffset={4}
					collisionPadding={8}
				>
					<Popover.Popup
						className={cn(popupPanelClass, "w-72 p-2")}
						aria-label={label ?? t("customInputs.selectDate")}
					>
						<div className="surface-ink mb-2 flex items-center justify-between gap-1 px-1 py-1.5">
							<button
								type="button"
								onClick={() => changeMonth(-1)}
								className="flex size-8 items-center justify-center text-white outline-none transition-colors hover:text-electric-lime focus-visible:ring-2 focus-visible:ring-electric-lime"
								aria-label={t("customInputs.prevMonth")}
							>
								<ChevronLeft className="size-4" strokeWidth={3} aria-hidden />
							</button>
							<span className="font-black font-display text-white text-xs uppercase tracking-wide">
								{currentDate.toLocaleString(locale, {
									month: "long",
									year: "numeric",
								})}
							</span>
							<button
								type="button"
								onClick={() => changeMonth(1)}
								className="flex size-8 items-center justify-center text-white outline-none transition-colors hover:text-electric-lime focus-visible:ring-2 focus-visible:ring-electric-lime"
								aria-label={t("customInputs.nextMonth")}
							>
								<ChevronRight className="size-4" strokeWidth={3} aria-hidden />
							</button>
						</div>

						<div className="mb-1 grid grid-cols-7 gap-1 text-center">
							{WEEKDAY_KEYS.map((weekdayKey, index) => (
								<div
									key={weekdayKey}
									className="font-body font-bold text-[10px] text-gray-400 uppercase tracking-widest"
								>
									{dayHeaders[index] ?? weekdayKey}
								</div>
							))}
						</div>

						<div className="grid grid-cols-7 gap-1 text-center">
							{WEEKDAY_KEYS.slice(0, firstDay).map((weekdayKey) => (
								<div key={`pad-${weekdayKey}`} aria-hidden />
							))}
							{Array.from({ length: daysInMonth }).map((_, i) => {
								const day = i + 1;
								const year = currentDate.getFullYear();
								const month = String(currentDate.getMonth() + 1).padStart(
									2,
									"0",
								);
								const dayStr = String(day).padStart(2, "0");
								const currentDateStr = `${year}-${month}-${dayStr}`;

								const isDisabled =
									(minDate && currentDateStr < minDate) ||
									(maxDate && currentDateStr > maxDate);

								const isSelected = value === currentDateStr;

								return (
									<button
										key={day}
										type="button"
										onClick={() => !isDisabled && handleDateClick(day)}
										disabled={!!isDisabled}
										className={cn(
											"rounded-sm p-1.5 font-body font-bold text-xs tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-electric-lime",
											isDisabled && "cursor-not-allowed text-gray-300",
											!isDisabled &&
												!isSelected &&
												"text-ink hover:bg-electric-lime hover:text-ink",
											isSelected && "surface-ink",
										)}
									>
										{day}
									</button>
								);
							})}
						</div>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
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
	const inputId = useId();

	return (
		<div className="flex w-full flex-col">
			<label htmlFor={inputId} className={fieldLabelClass}>
				{label}
			</label>
			<div className="relative">
				<input
					id={inputId}
					type="time"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="w-full border-[3px] border-black bg-white py-3 pr-10 pl-3 font-body font-bold text-black tabular-nums shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] outline-none focus-visible:ring-4 focus-visible:ring-electric-lime"
				/>
				<span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 bg-white pl-1 text-black">
					<Clock className="size-4" strokeWidth={2.5} aria-hidden />
				</span>
			</div>
		</div>
	);
};
