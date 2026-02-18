import { db } from "./db";

export interface Settings {
	hostname: string;
	timezone: string;
	theme: string;
}

export function getSettings(): Settings {
	const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
	const settings: Record<string, string> = {};
	for (const row of rows) {
		settings[row.key] = row.value;
	}
	return {
		hostname: settings.hostname || "",
		timezone: settings.timezone || "UTC",
		theme: settings.theme || "dark",
	};
}

export function updateSetting(key: string, value: string): void {
	const updatedAt = new Date().toISOString();
	db.prepare(`
		INSERT INTO settings (key, value, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
	`).run(key, value, updatedAt);
}

export function updateSettings(updates: Partial<Settings>): void {
	const updatedAt = new Date().toISOString();
	const stmt = db.prepare(`
		INSERT INTO settings (key, value, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
	`);

	const transaction = db.transaction(() => {
		for (const [key, value] of Object.entries(updates)) {
			if (value !== undefined) {
				stmt.run(key, value, updatedAt);
			}
		}
	});

	transaction();
}
