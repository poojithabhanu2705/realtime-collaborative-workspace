import { cn } from "../../utils/cn";

export default function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "glass-card rounded-3xl p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
