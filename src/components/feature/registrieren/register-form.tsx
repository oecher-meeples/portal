"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemInvite } from "@/components/feature/registrieren/actions";

export function RegisterForm({ defaultToken }: { defaultToken?: string }) {
  const router = useRouter();
  const [token, setToken] = useState(defaultToken ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await redeemInvite({ token, email, password, name });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/login");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card flex flex-col gap-4 rounded-lg border p-6"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="token">Einladungs-Token</Label>
        <Input
          id="token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Aus der Einladungs-E-Mail"
          className="font-mono text-sm"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-email">E-Mail</Label>
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reg-password">Passwort festlegen</Label>
        <Input
          id="reg-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Konto wird aktiviertâ€¦" : "Konto aktivieren"}
      </Button>
    </form>
  );
}
