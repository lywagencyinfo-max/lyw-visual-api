import path from "node:path";

// process.cwd() = adhesions-platform/. On remonte d'un cran pour taper le
// dossier racine ASBL-Adhesions/ (qui contient .claude/agents/adhesions.md).
export const REPO_ROOT = path.resolve(process.cwd(), "..");

export const PATHS = {
  agents: path.join(REPO_ROOT, ".claude", "agents"),
};
