"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";
import { translateAuthError } from "@/lib/auth/password";
import {
  clearLoginCooldown,
  getLoginCooldownSeconds,
  recordLoginFailureClient,
} from "@/lib/auth/login-cooldown";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // #324 (Live-Review-Ergänzung): "Passwort vergessen?" erst nach einem
  // Fehlversuch zeigen, nicht direkt beim ersten Formularaufruf — bleibt
  // danach dauerhaft sichtbar, auch wenn `error` bei einem weiteren Versuch
  // zwischenzeitlich wieder auf null gesetzt wird.
  const [hasFailedOnce, setHasFailedOnce] = useState(false);
  // #425: client-seitige Näherung des Server-Backoffs (#326) — der Server
  // bestätigt nie, ob ein Fehlversuch am Passwort oder am Cooldown lag, also
  // spiegelt diese Zahl nur nach, ohne je serverseitig bestätigt zu sein.
  // `now` tickt sekündlich, cooldownSeconds wird daraus beim Rendern
  // abgeleitet statt per setState im Effekt geschrieben zu werden.
  const [now, setNow] = useState(() => Date.now());
  const cooldownSeconds = getLoginCooldownSeconds(email, now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        recordLoginFailureClient(email);
        setNow(Date.now());
        setError(translateAuthError(signInError.message));
        setHasFailedOnce(true);
        return;
      }

      clearLoginCooldown(email);
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Netzwerkfehler o.ä. — ohne dieses catch bliebe der Button dauerhaft
      // im "Anmelden…"-Zustand hängen, ohne dass der Nutzer je eine
      // Rückmeldung bekommt. Kein echter Login-Fehlversuch, zählt daher
      // nicht in den Cooldown-Zähler. #324-Folgefehler: authClient.signIn.email()
      // wirft bei falschen Zugangsdaten in der Praxis tatsächlich, statt
      // { error } zurückzugeben (anders als im Mock angenommen) — landete
      // dadurch immer hier statt im if-Zweig unten, und
      // "Passwort vergessen?" blieb für jeden Fehlversuch unsichtbar.
      setError("Das hat leider nicht funktioniert. Bitte versuche es erneut.");
      setHasFailedOnce(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      <PageHeading eyebrow="Mitgliederbereich" title="Anmelden" />
      <form
        onSubmit={handleSubmit}
        className="bg-card flex flex-col gap-4 rounded-lg border p-6"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-Mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="du@beispiel.de"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        {cooldownSeconds > 0 && (
          <p className="text-muted-foreground text-sm">
            Zu viele Fehlversuche — bitte warte noch ca. {cooldownSeconds}{" "}
            Sekunden.
          </p>
        )}
        <Button type="submit" disabled={isSubmitting || cooldownSeconds > 0}>
          {isSubmitting ? "Anmelden…" : "Anmelden"}
        </Button>
        {hasFailedOnce && (
          <Link
            href={`/passwort-vergessen${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="text-primary text-center text-sm hover:underline"
          >
            Passwort vergessen?
          </Link>
        )}
      </form>
      <p className="text-muted-foreground text-center text-sm">
        Einladung erhalten?{" "}
        <Link href="/registrieren" className="text-primary hover:underline">
          Konto einrichten
        </Link>
      </p>
    </div>
  );
}
