export type ShiftStatus = "sicher" | "vorlaeufig" | "offen" | "voll";

export type HelperShift = {
  name: string;
  role: string;
  emoji: string;
  time: string;
  capacity: number;
  assigned: number;
  status: ShiftStatus;
  assignedToMe?: boolean;
};

export const HELFER_EVENT = {
  title: "Sommerfest 09.08.",
};

export const HELFER_SHIFTS: HelperShift[] = [
  {
    name: "Einlass",
    role: "Einlass",
    emoji: "🎟️",
    time: "14–16",
    capacity: 2,
    assigned: 2,
    status: "voll",
  },
  {
    name: "Theke",
    role: "Theke",
    emoji: "🍹",
    time: "16–18",
    capacity: 2,
    assigned: 1,
    status: "offen",
  },
  {
    name: "Spieleausleihe",
    role: "Leihe",
    emoji: "🎲",
    time: "14–18",
    capacity: 2,
    assigned: 0,
    status: "offen",
  },
  {
    name: "Erklärbär-Tisch",
    role: "Erklärbär",
    emoji: "🧸",
    time: "ganztags",
    capacity: 4,
    assigned: 3,
    status: "vorlaeufig",
    assignedToMe: true,
  },
  {
    name: "Abbau",
    role: "Abbau",
    emoji: "📦",
    time: "20–22",
    capacity: 3,
    assigned: 1,
    status: "offen",
  },
];
