export function isDateInRange(
	date: string,
	minDate?: string,
	maxDate?: string,
): boolean {
	if (minDate && date < minDate) return false;
	if (maxDate && date > maxDate) return false;
	return true;
}

export function normalizeDateRange(
	minDate?: string,
	maxDate?: string,
): { minDate?: string; maxDate?: string } {
	if (minDate && maxDate && minDate > maxDate) {
		return { minDate, maxDate: minDate };
	}
	return { minDate, maxDate };
}

/** Month shown when opening the picker — prefers a month with selectable days. */
export function getCalendarFocusDate(
	value: string,
	minDate?: string,
	maxDate?: string,
): Date {
	if (value && isDateInRange(value, minDate, maxDate)) {
		return new Date(`${value}T12:00:00`);
	}
	if (minDate) {
		return new Date(`${minDate}T12:00:00`);
	}
	if (maxDate) {
		return new Date(`${maxDate}T12:00:00`);
	}
	return new Date();
}

export function getStageStartDateBounds(
	stage: { startDate?: string; endDate?: string },
	tournamentStartDate?: string,
	tournamentEndDate?: string,
): { minDate?: string; maxDate?: string } {
	const minDate = tournamentStartDate || undefined;
	let maxDate = tournamentEndDate || undefined;

	if (
		stage.endDate &&
		isDateInRange(stage.endDate, tournamentStartDate, tournamentEndDate)
	) {
		maxDate = stage.endDate;
	}

	return normalizeDateRange(minDate, maxDate);
}

export function getStageEndDateBounds(
	stage: { startDate?: string; endDate?: string },
	tournamentStartDate?: string,
	tournamentEndDate?: string,
): { minDate?: string; maxDate?: string } {
	let minDate = tournamentStartDate || undefined;
	const maxDate = tournamentEndDate || undefined;

	if (
		stage.startDate &&
		isDateInRange(stage.startDate, tournamentStartDate, tournamentEndDate)
	) {
		minDate = stage.startDate;
	}

	return normalizeDateRange(minDate, maxDate);
}
