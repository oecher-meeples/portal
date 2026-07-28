import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header({ user }: { user: { name: string } | null }) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        <UserMenu user={user} />
        <ThemeToggle />
      </div>
    </header>
  );
}
