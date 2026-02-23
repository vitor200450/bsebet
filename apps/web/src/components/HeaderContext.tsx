import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface HeaderConfig {
	title?: string;
	breadcrumb?: { label: string; to?: string }[];
	actions?: ReactNode;
	variant?: "light" | "dark";
	hideHeader?: boolean;
}

const HeaderStateContext = createContext<HeaderConfig | null>(null);
const HeaderDispatchContext = createContext<
	((config: HeaderConfig | null) => void) | undefined
>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
	const [config, setConfig] = useState<HeaderConfig | null>(null);

	return (
		<HeaderStateContext.Provider value={config}>
			<HeaderDispatchContext.Provider value={setConfig}>
				{children}
			</HeaderDispatchContext.Provider>
		</HeaderStateContext.Provider>
	);
}

export function useHeader() {
	const config = useContext(HeaderStateContext);
	const setConfig = useContext(HeaderDispatchContext);

	if (setConfig === undefined) {
		throw new Error("useHeader must be used within a HeaderProvider");
	}

	// Backward compatibility: existing components expect { config, setConfig }
	// But they shouldn't be setting it via this hook if they want to avoid re-renders
	// For now, we keep the signature but encourage useSetHeader for setters.
	return { config, setConfig };
}

export function useSetHeader(config?: HeaderConfig) {
	const setConfig = useContext(HeaderDispatchContext);

	if (setConfig === undefined) {
		throw new Error("useSetHeader must be used within a HeaderProvider");
	}

	useEffect(() => {
		if (config) {
			setConfig(config);
			return () => setConfig(null);
		}
	}, [config, setConfig]);
}
