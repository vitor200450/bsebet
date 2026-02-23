// --- FRONTEND DIAGNOSTIC SCRIPT ---
// Copy and paste this into your Browser Console on the production site

async function diagnoseFrontend() {
	console.log("--- Frontend Diagnostic ---");

	// 1. Check current URL
	console.log("Current URL:", window.location.href);

	// 2. Fetch matches from the API endpoint the app uses
	// Based on your code, this likely uses TanStack Query or direct fetch.
	// Let's try to hit the server function endpoint if possible, or just check the React state if we can reach it (hard in console).

	// Instead, let's look at the Network tab. But I can't see your network tab.
	// I will try to fetch the homepage data if I can guess the endpoint.
	// Tanstack Start usually puts server functions at /_server/...

	console.log("Checking for global data...");
	// Check if there's any global state exposed (unlikely in prod)

	console.log("--- INSTRUCTIONS ---");
	console.log("1. Go to the Network Key in DevTools");
	console.log("2. Refresh the page");
	console.log("3. Filter by 'Fetch/XHR'");
	console.log(
		"4. Look for a request that returns the matches (likely named 'getHomeTournamentData' or similar)",
	);
	console.log("5. Click it and look at the 'Response' tab");
	console.log("6. Search for 'id': 17");

	console.log(
		"If you see ID 17 in the NETWORK response, then your Backend IS returning it.",
	);
	console.log(
		"If you DO NOT see ID 17 in the Network response, but see it on screen, then it is CACHED HTML/JSON.",
	);
}

diagnoseFrontend();
