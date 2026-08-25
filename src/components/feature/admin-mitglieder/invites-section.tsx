"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Copy,
  Link as LinkIcon,
  Mail,
  RotateCcw,
  Search,
} from "lucide-react";
import { StatTile } from "@/components/ui/stat-tile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActionButton } from "@/components/ui/action-button";
import { InviteStatusPill } from "@/components/entities/invite-status-pill";
import { InviteForm } from "@/components/feature/admin-mitglieder/invite-form";
import {
  extendInvite,
  revokeInvite,
} from "@/components/feature/admin-mitglieder/invite-actions";
import { formatDatePlain } from "@/lib/utils/format";
import {
  buildRegistrationLink,
  formatInviteMessage,
  type InviteStatus,
} from "@/lib/members/invites";

export type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  createdByDisplayName: string;
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  status: InviteStatus;
};

const INVITE_STATUS_FILTERS: { value: InviteStatus; label: string }[] = [
  { value: "offen", label: "Offen" },
  { value: "abgelaufen", label: "Abgelaufen" },
  { value: "eingeloest", label: "Eingelöst" },
  { value: "widerrufen", label: "Widerrufen" },
];

const DEFAULT_ACTIVE_STATUSES: InviteStatus[] = ["offen", "abgelaufen"];

function germanDate(value: string | null) {
  return value ? formatDatePlain(value) : "—";
}

export function InvitesSection({ invites }: { invites: InviteRow[] }) {
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState<Set<InviteStatus>>(
    () => new Set(DEFAULT_ACTIVE_STATUSES),
  );
  // Empty until mounted, so server and first client render agree (relative
  // link) and the browser's real origin only lands after hydration.
  const [origin, setOrigin] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  function toggleStatus(status: InviteStatus) {
    setActiveStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  // Absolute counts, independent of search/filter — the stat card always
  // reflects the true open/expired state, not the currently filtered view.
  const openCount = invites.filter((i) => i.status === "offen").length;
  const expiredCount = invites.filter((i) => i.status === "abgelaufen").length;

  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      if (!activeStatuses.has(invite.status)) return false;
      if (
        search &&
        !invite.email?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [invites, search, activeStatuses]);

  return (
    <div id="einladungen" className="flex flex-col gap-4">
      <h2 className="font-serif text-lg font-bold">Einladungen</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile label="Offene Einladungen" value={openCount} />
        <StatTile label="Abgelaufene Einladungen" value={expiredCount} />
      </div>
      <InviteForm />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="E-Mail suchen …"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {INVITE_STATUS_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              size="sm"
              variant={activeStatuses.has(value) ? "default" : "outline"}
              onClick={() => toggleStatus(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erzeugt von</TableHead>
              <TableHead>Erzeugt am</TableHead>
              <TableHead>Läuft ab / eingelöst am</TableHead>
              <TableHead className="text-right"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvites.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-6 text-center"
                >
                  Keine Einladungen gefunden.
                </TableCell>
              </TableRow>
            )}
            {filteredInvites.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell className="font-medium">
                  {invite.email ?? "*"}
                </TableCell>
                <TableCell>
                  <InviteStatusPill status={invite.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invite.createdByDisplayName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {germanDate(invite.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {invite.redeemedAt
                    ? germanDate(invite.redeemedAt)
                    : germanDate(invite.expiresAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {invite.status === "offen" && (
                      <>
                        {(() => {
                          const link = buildRegistrationLink(
                            origin,
                            invite.token,
                            invite.email,
                          );
                          const message = formatInviteMessage(
                            link,
                            new Date(invite.expiresAt),
                          );
                          const mailtoHref = `mailto:${invite.email ?? ""}?subject=${encodeURIComponent(
                            "Einladung zu Oecher Meeples",
                          )}&body=${encodeURIComponent(message)}`;
                          return (
                            <>
                              <CopyButton
                                size="sm"
                                value={invite.token}
                                label="Token kopieren"
                                icon={Copy}
                              />
                              <CopyButton
                                size="sm"
                                value={message}
                                label="Einladung kopieren"
                                icon={Mail}
                              />
                              <CopyButton
                                size="sm"
                                value={link}
                                label="Link kopieren"
                                icon={LinkIcon}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                render={
                                  <a
                                    href={mailtoHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  />
                                }
                              >
                                <Mail />
                                Per Mail versenden
                              </Button>
                            </>
                          );
                        })()}
                        <ActionButton
                          variant="destructive"
                          size="sm"
                          action={revokeInvite.bind(null, invite.id)}
                          pendingLabel="Widerrufe…"
                          confirm="Diese Einladung wirklich widerrufen? Der Link funktioniert danach nicht mehr."
                        >
                          <Ban />
                          Widerrufen
                        </ActionButton>
                      </>
                    )}
                    {invite.status === "abgelaufen" && (
                      <ActionButton
                        variant="outline"
                        size="sm"
                        action={extendInvite.bind(null, invite.id)}
                        pendingLabel="Verlängere…"
                        confirm="Diese Einladung um ihre ursprüngliche Gültigkeitsdauer verlängern?"
                      >
                        <RotateCcw />
                        Verlängern
                      </ActionButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
