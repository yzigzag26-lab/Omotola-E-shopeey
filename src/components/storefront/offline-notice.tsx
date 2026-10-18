export function OfflineNotice({ source }: { source: "supabase" | "offline" }) {
  if (source !== "offline") return null;
  return (
    <div className="border-b border-gold/40 bg-gold-soft/20">
      <div className="shell flex flex-col gap-1 py-2 text-[11px] uppercase tracking-[0.16em] text-burgundy sm:flex-row sm:items-center sm:justify-between">
        <span>Offline preview — bundled demo catalogue</span>
        <span className="normal-case tracking-normal text-muted">
          Live data is unavailable from this environment. Admin and ordering stay disabled.
        </span>
      </div>
    </div>
  );
}
