export type GameStatus = "AVAILABLE" | "BORROWED" | "MAINTENANCE";

export type GameCopy = {
  code: string;
  location: string;
  status: GameStatus;
};

export type Explainer = {
  name: string;
  level: 1 | 2 | 3;
};

export type BoardGame = {
  slug: string;
  title: string;
  players: string;
  duration: string;
  weight: number;
  description: string;
  mechanics: string[];
  status: GameStatus;
  copies: GameCopy[];
  explainers: Explainer[];
};

export const GAMES: BoardGame[] = [
  {
    slug: "arche-nova",
    title: "Arche Nova",
    players: "1–4",
    duration: "90–150’",
    weight: 3.7,
    description:
      "Baue und verwalte einen modernen Zoo mit Fokus auf Artenschutz und Forschung. Ein vielschichtiges Engine-Building-Spiel.",
    mechanics: ["Engine-Building", "Kartenmanagement", "Tableau-Building"],
    status: "AVAILABLE",
    copies: [
      { code: "OM-2026-0421", location: "Regal C4", status: "AVAILABLE" },
      { code: "OM-2026-0422", location: "privat · Tobias", status: "BORROWED" },
    ],
    explainers: [
      { name: "Jan Herwig", level: 3 },
      { name: "Nadia", level: 2 },
    ],
  },
  {
    slug: "brass-birmingham",
    title: "Brass: Birmingham",
    players: "2–4",
    duration: "60–120’",
    weight: 3.9,
    description:
      "Wirtschafts-Strategiespiel im industriellen England: baue Netzwerke, Fabriken und Handelsrouten über zwei Epochen.",
    mechanics: ["Netzwerkbau", "Handkartenmanagement", "Wirtschaftssimulation"],
    status: "BORROWED",
    copies: [
      { code: "OM-2025-0113", location: "privat · Lea", status: "BORROWED" },
    ],
    explainers: [{ name: "Tobias K.", level: 3 }],
  },
  {
    slug: "cascadia",
    title: "Cascadia",
    players: "1–4",
    duration: "30–45’",
    weight: 1.9,
    description:
      "Lege Landschafts- und Tierplättchen, um Habitate für die Tierwelt des pazifischen Nordwestens zu gestalten.",
    mechanics: ["Plättchenlegen", "Mustererkennung"],
    status: "AVAILABLE",
    copies: [
      { code: "OM-2024-0087", location: "Regal A2", status: "AVAILABLE" },
    ],
    explainers: [{ name: "Lea Meier", level: 2 }],
  },
  {
    slug: "root",
    title: "Root",
    players: "2–4",
    duration: "60–90’",
    weight: 3.1,
    description:
      "Asymmetrischer Waldkrieg: jede Fraktion verfolgt eigene Regeln und Siegbedingungen in einer wimmelnden Tierwelt.",
    mechanics: ["Asymmetrie", "Gebietskontrolle", "Konflikt"],
    status: "MAINTENANCE",
    copies: [
      { code: "OM-2025-0188", location: "Werkstatt", status: "MAINTENANCE" },
    ],
    explainers: [{ name: "Jan Herwig", level: 2 }],
  },
  {
    slug: "ark-nova-zoo",
    title: "Ark Nova: Zoo",
    players: "1–4",
    duration: "90’",
    weight: 3.5,
    description:
      "Erweiterung für Arche Nova mit neuen Gehegen, Sponsoren und Herausforderungen.",
    mechanics: ["Engine-Building", "Erweiterung"],
    status: "AVAILABLE",
    copies: [
      { code: "OM-2026-0501", location: "Regal C4", status: "AVAILABLE" },
    ],
    explainers: [{ name: "Nadia", level: 1 }],
  },
  {
    slug: "wingspan",
    title: "Wingspan",
    players: "1–5",
    duration: "40–70’",
    weight: 2.4,
    description:
      "Locke seltene Vogelarten in dein Habitat-Netzwerk und sammle Eier, Futter und Karteneffekte.",
    mechanics: ["Kartenmanagement", "Engine-Building"],
    status: "AVAILABLE",
    copies: [
      { code: "OM-2023-0044", location: "Regal A1", status: "AVAILABLE" },
    ],
    explainers: [
      { name: "Lea Meier", level: 3 },
      { name: "Tobias K.", level: 2 },
    ],
  },
  {
    slug: "terraforming-mars",
    title: "Terraforming Mars",
    players: "1–5",
    duration: "120’",
    weight: 3.2,
    description:
      "Konzerne wetteifern um die Terraformierung des Mars durch Temperatur-, Sauerstoff- und Ozeanprojekte.",
    mechanics: ["Kartenmanagement", "Tableau-Building"],
    status: "BORROWED",
    copies: [
      { code: "OM-2024-0210", location: "privat · Nadia", status: "BORROWED" },
    ],
    explainers: [{ name: "Jan Herwig", level: 3 }],
  },
  {
    slug: "die-crew",
    title: "Die Crew",
    players: "2–5",
    duration: "20’",
    weight: 1.6,
    description:
      "Kooperatives Stichspiel: die Raumschiff-Crew muss gemeinsame Missionen ohne Kommunikation über Handkarten meistern.",
    mechanics: ["Kooperativ", "Stichspiel"],
    status: "AVAILABLE",
    copies: [
      { code: "OM-2022-0009", location: "Regal B3", status: "AVAILABLE" },
    ],
    explainers: [{ name: "Nadia", level: 2 }],
  },
];

export const TOTAL_GAMES_IN_INVENTORY = 612;

export function getGameBySlug(slug: string) {
  return GAMES.find((game) => game.slug === slug);
}

export const STATUS_LABELS: Record<GameStatus, string> = {
  AVAILABLE: "Verfügbar",
  BORROWED: "Verliehen",
  MAINTENANCE: "Wartung",
};
