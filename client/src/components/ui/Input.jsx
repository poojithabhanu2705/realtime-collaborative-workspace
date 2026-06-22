import { cn } from "../../utils/cn";

export default function Input({ label, error, className, ...props }) {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-primary/60 ml-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          "w-full px-4 py-3 bg-white/50 border border-primary/10 rounded-2xl text-primary transition-all",
          "focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/30",
          "placeholder:text-primary/30",
          error && "border-red-400 focus:border-red-400 focus:ring-red-50",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
}
