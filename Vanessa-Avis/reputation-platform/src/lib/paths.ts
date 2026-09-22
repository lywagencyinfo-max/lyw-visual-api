import path from "node:path";

// process.cwd() = reputation-platform/. On remonte d'un cran pour taper le
// dossier racine Vanessa-Avis/ (qui contient .claude/agents/avis.md).
export const REPO_ROOT = path.resolve(process.cwd(), "..");

export const PATHS = {
  agents: path.join(REPO_ROOT, ".claude", "agents"),
};
