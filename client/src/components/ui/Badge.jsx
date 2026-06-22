import { cn } from "../../utils/cn";

export default function Badge({ children, variant = "default", className }) {
  const variants = {
    default: "bg-primary/10 text-primary",
    success: "bg-accent/20 text-[#6B8E78]",
    secondary: "bg-secondary/10 text-secondary",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
