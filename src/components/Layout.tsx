import { ReactNode } from "react";
import { Button } from "./ui/button";
import { ThemeProvider } from "./theme-provider";
import { ModeToggle } from "./mode-toggle";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import { cn } from "~/lib/utils";
import { ScrollIcon } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const curRoute = router.route;
  console.log("curRoute", curRoute);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="h-screen">
        <header
          className={cn(
            "flex items-center justify-between p-4",
            "border-border/40 bg-background/95 supports-[backdrop-filter]:bg-background/60 top-0 z-50 w-full backdrop-blur",
          )}
        >
          <div className="flex gap-2">
            <ScrollIcon />
            <h1 className="text-xl font-bold tracking-tight">Writing App</h1>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <Button onClick={() => void signOut()}>Log Out</Button>
          </div>
        </header>
        {children}
      </div>
    </ThemeProvider>
  );
}
