import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PreviewTierSwitcher } from "@/components/feature/admin-preview-tier/preview-tier-switcher";
import { FeedbackButton } from "@/components/feature/feedback/feedback-button";
import type { Tier } from "@/lib/utils/nav-config";

export function Header({
  user,
  previewTier,
}: {
  user: { name: string; meepleId: string } | null;
  /** Only passed for real admins — renders the tier switcher. */
  previewTier?: Tier;
}) {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6">
      <Logo />
      <div className="flex items-center gap-3">
        {previewTier && <PreviewTierSwitcher tier={previewTier} />}
        {user && <FeedbackButton />}
        <UserMenu user={user} />
        {/* < sm hat MobileNav (im ersten Bottom-Sheet) bereits einen eigenen
            Theme-Toggle — hier redundant. */}
        <ThemeToggle className="hidden sm:inline-flex" />
      </div>
    </header>
  );
}
