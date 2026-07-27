import Link from "next/link";
import { LogIn } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-1.5 sm:inline-flex"
          render={
            <Link href="/login">
              <LogIn className="size-4" />
              Anmelden
            </Link>
          }
        />
        <RoleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
