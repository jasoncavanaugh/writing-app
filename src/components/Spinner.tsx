import { cn } from "~/lib/utils";

export function Spinner({ className = "" }: { className?: string }) {
  return <div className={cn("border-t-primary rounded-full", className)} />;
}
