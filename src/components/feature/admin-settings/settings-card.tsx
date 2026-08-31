import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { SETTINGS_CARD_HOVER_CLASS } from "@/components/feature/admin-settings/settings-card-hover";

export function SettingsCard({
  title,
  description,
  href,
  status,
  count,
}: {
  title: string;
  description: string;
  href: string;
  status?: {
    label: string;
    variant?: VariantProps<typeof badgeVariants>["variant"];
  };
  count?: number;
}) {
  return (
    <Link href={href} className="group">
      <Card className={SETTINGS_CARD_HOVER_CLASS}>
        {count !== undefined && (
          <Badge
            variant="default"
            className="absolute top-1/2 right-4 h-7 min-w-7 -translate-y-1/2 px-2.5 text-sm"
          >
            {count}
          </Badge>
        )}
        <CardHeader className={count !== undefined ? "pr-14" : undefined}>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            {status && (
              <Badge variant={status.variant ?? "secondary"}>
                {status.label}
              </Badge>
            )}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
