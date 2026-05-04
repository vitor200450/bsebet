import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const normalize = (value) =>
	path.normalize(value).replaceAll("\\", "/").toLowerCase();
const agentsSkillsDir = path.join(os.homedir(), ".agents", "skills");

const toFilesystemPath = (value) => {
	if (typeof value !== "string" || !value.trim()) return null;
	if (value.startsWith("file://")) return fileURLToPath(value);
	return value;
};

const isSuperpowersSkillsDir = (value) => {
	const normalized = normalize(value);
	return (
		normalized.endsWith("/node_modules/superpowers/skills") ||
		normalized.includes("superpowers@git+https_")
	);
};

export const StripSuperpowersBundledSkills = async () => {
	return {
		config: async (config) => {
			const skillPaths = config.skills?.paths;
			if (!Array.isArray(skillPaths)) return;

			for (const skillPath of skillPaths) {
				const sourcePath = toFilesystemPath(skillPath);
				if (
					!sourcePath ||
					!isSuperpowersSkillsDir(sourcePath) ||
					!fs.existsSync(sourcePath)
				)
					continue;

				fs.mkdirSync(agentsSkillsDir, { recursive: true });
				fs.cpSync(sourcePath, agentsSkillsDir, {
					recursive: true,
					force: true,
				});
			}

			config.skills.paths = skillPaths.filter((skillPath) => {
				const normalized = normalize(skillPath);
				return (
					!normalized.includes("superpowers@git+https_") &&
					!normalized.endsWith("/node_modules/superpowers/skills")
				);
			});
		},
	};
};
