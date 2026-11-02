import clsx from "clsx";

export const inputCls = "w-full rounded-lg border border-line bg-bg px-3 py-2.5 text-sm text-ink placeholder:text-ink-dim focus:border-mint focus:outline-none";

export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-dim">{hint}</p>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  tone = "default",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition disabled:opacity-40",
        tone === "primary" && "bg-mint text-bg hover:brightness-110",
        tone === "danger" && "bg-rose/20 text-rose-soft hover:bg-rose/30",
        tone === "default" && "border border-line bg-bg-soft hover:bg-card",
      )}
    >
      {children}
    </button>
  );
}

/** Bouton de suppression en deux temps (les boîtes de dialogue du navigateur ne sont pas fiables partout). */
export function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <details className="group relative">
      <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-bold text-rose-soft hover:bg-rose/10">Supprimer</summary>
      <div className="absolute right-0 z-10 mt-1 w-56 rounded-lg border border-line bg-card p-3 text-sm shadow-lg">
        <p className="mb-2 text-ink-soft">Supprimer définitivement ?</p>
        <Button tone="danger" onClick={onConfirm}>
          Oui, supprimer
        </Button>
      </div>
    </details>
  );
}
