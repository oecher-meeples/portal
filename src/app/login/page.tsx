import Link from "next/link";
import { PageHeading } from "@/components/shared/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading eyebrow="Mitgliederbereich" title="Anmelden" />
      <div className="bg-card flex flex-col gap-4 rounded-lg border p-6">
        <Button variant="outline" className="gap-2">
          <span aria-hidden>🇬</span> Mit Google anmelden
        </Button>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <Separator className="flex-1" />
          oder
          <Separator className="flex-1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" type="email" placeholder="du@beispiel.de" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input id="password" type="password" placeholder="••••••••" />
        </div>
        <Button>Anmelden</Button>
      </div>
      <p className="text-muted-foreground text-center text-sm">
        Einladung erhalten?{" "}
        <Link href="/registrieren" className="text-primary hover:underline">
          Konto einrichten
        </Link>
      </p>
    </div>
  );
}
