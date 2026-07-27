export type MemberStatus = "aktiv" | "einladung" | "ausgetreten";

export type Member = {
  id: string;
  name: string;
  role: "Admin" | "Moderatorin" | "Moderator" | "Mitglied";
  status: MemberStatus;
  joined: string;
  initial: string;
  anonymized?: boolean;
};

export const MEMBERS: Member[] = [
  { id: "jan", name: "Jan Herwig", role: "Admin", status: "aktiv", joined: "2024", initial: "J" },
  { id: "lea", name: "Lea Meier", role: "Moderatorin", status: "aktiv", joined: "2023", initial: "L" },
  { id: "tobias", name: "Tobias K.", role: "Mitglied", status: "aktiv", joined: "2025", initial: "T" },
  {
    id: "invite-1",
    name: "neu@example.de",
    role: "Mitglied",
    status: "einladung",
    joined: "–",
    initial: "n",
  },
  {
    id: "anon-1",
    name: "(anonymisiert)",
    role: "Mitglied",
    status: "ausgetreten",
    joined: "2022",
    initial: "?",
    anonymized: true,
  },
];

export const MEMBER_STATS = {
  total: 96,
  openInvitations: 4,
};
