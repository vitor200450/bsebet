import { useEffect, useState } from "react";

/** Keeps modal mounted through exit so opacity/transform can finish. */
export function useModalPresence(open: boolean, exitMs = 150) {
	const [present, setPresent] = useState(open);
	const [visible, setVisible] = useState(open);

	useEffect(() => {
		if (open) {
			setPresent(true);
			const id = requestAnimationFrame(() => {
				requestAnimationFrame(() => setVisible(true));
			});
			return () => cancelAnimationFrame(id);
		}

		setVisible(false);
		const timeout = window.setTimeout(() => setPresent(false), exitMs);
		return () => window.clearTimeout(timeout);
	}, [open, exitMs]);

	return {
		present,
		visible,
		exiting: present && !visible,
	};
}
