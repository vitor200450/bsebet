import { useTranslation } from "react-i18next";

type LegalSectionKey = "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7" | "s8";

const SECTION_KEYS: LegalSectionKey[] = [
	"s1",
	"s2",
	"s3",
	"s4",
	"s5",
	"s6",
	"s7",
	"s8",
];

type LegalDocumentPageProps = {
	document: "terms" | "privacy";
};

export function LegalDocumentPage({ document }: LegalDocumentPageProps) {
	const { t } = useTranslation("legal");

	return (
		<div className="bg-paper text-ink">
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-16">
				<header className="mb-10 border-black border-b-4 pb-6">
					<p className="font-black text-gray-500 text-xs uppercase tracking-[0.2em]">
						{t(`${document}.eyebrow`)}
					</p>
					<h1 className="mt-3 font-black text-4xl text-black uppercase italic tracking-tighter sm:text-5xl">
						{t(`${document}.title`)}
					</h1>
					<p className="mt-4 font-bold text-gray-600 text-sm">
						{t(`${document}.lastUpdated`)}
					</p>
					<p className="mt-4 font-medium text-base text-gray-700 leading-relaxed">
						{t(`${document}.intro`)}
					</p>
				</header>

				<div className="space-y-8">
					{SECTION_KEYS.map((key) => (
						<section
							key={key}
							className="border-2 border-black bg-white p-6 shadow-comic-sm"
						>
							<h2 className="font-black text-black text-xl uppercase italic tracking-tight">
								{t(`${document}.sections.${key}.title`)}
							</h2>
							<p className="mt-3 whitespace-pre-line font-medium text-gray-700 text-sm leading-relaxed">
								{t(`${document}.sections.${key}.body`)}
							</p>
						</section>
					))}
				</div>
			</div>
		</div>
	);
}
