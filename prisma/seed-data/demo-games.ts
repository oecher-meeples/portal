/**
 * 199 real, published board games with real cover images sourced from Wikipedia
 * and Wikimedia Commons (the BGG XML API is unreachable from this environment —
 * 401/403 on every request — so this stands in for a live BGG import). 47 entries
 * still have `imageUrl: null` (was 62): no freely licensed (CC0/CC-BY/CC-BY-SA/PD)
 * cover image or gameplay photo could be confirmed on Wikimedia Commons for that
 * title; better to leave it empty than fabricate or guess a URL.
 */
export type DemoGame = {
  title: string;
  imageUrl: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  description: string;
  mechanics: string[];
};

export const DEMO_GAMES: DemoGame[] = [
  // Batch 1
  {
    title: "Catan",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.3,
    description:
      "Die Spieler siedeln auf der Insel Catan, sammeln Rohstoffe und bauen Straßen, Siedlungen und Städte, um als Erste 10 Siegpunkte zu erreichen.",
    mechanics: [
      "Handel",
      "Würfelglück",
      "Gebietsausbau",
      "Ressourcenmanagement",
    ],
  },
  {
    title: "Carcassonne",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/5e/Carcassonne-game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 1.9,
    description:
      "Durch das Legen von Landschaftsplättchen entsteht nach und nach eine Kartenlandschaft rund um die Stadt Carcassonne, in der Gefolgsleute Städte, Straßen und Klöster besetzen.",
    mechanics: ["Legespiel", "Gebietskontrolle", "Plättchen platzieren"],
  },
  {
    title: "Pandemic",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/Pandemic_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.4,
    description:
      "Als Team aus Spezialisten bekämpfen die Spieler gemeinsam vier Krankheitserreger, bevor sich die Seuchen weltweit unkontrolliert ausbreiten.",
    mechanics: ["Kooperativ", "Handkartenmanagement", "Aktionspunkte"],
  },
  {
    title: "Ticket to Ride",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/92/Ticket_to_Ride_Board_Game_Box_EN.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 1.8,
    description:
      "Die Spieler sammeln Zugkarten passender Farben, um Eisenbahnstrecken quer durch Nordamerika zu bauen und geheime Zielkarten zu erfüllen.",
    mechanics: ["Kartenmanagement", "Streckenbau", "Set Collection"],
  },
  {
    title: "Codenames",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b0/Codenames_board_game.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 15,
    weight: 1.3,
    description:
      "Zwei Geheimdienstchefs geben ihren Teams Hinweise mit nur einem Wort, um verdeckte Agentenkarten anhand ihrer Codenamen zu identifizieren.",
    mechanics: ["Bluffen", "Teamspiel", "Wortassoziation"],
  },
  {
    title: "Azul",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/2/23/Picture_of_Azul_game_box.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.8,
    description:
      "Die Spieler wählen abwechselnd farbige Fliesen aus, um damit ihre Paläste im Stil portugiesischer Azulejos möglichst geschickt zu verzieren.",
    mechanics: ["Legespiel", "Set Collection", "Drafting"],
  },
  {
    title: "Wingspan",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c3/3d-wingspan-768x752.png",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 70,
    weight: 2.4,
    description:
      "Als Vogelliebhaber legen die Spieler Vogelkarten in ihre Lebensräume an, um Nahrungsketten, Eier und Habitate optimal zu kombinieren.",
    mechanics: ["Kartenmanagement", "Engine Building", "Würfelglück"],
  },
  {
    title: "Terraforming Mars",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f0/Terraforming_Mars_board_game_box_cover.jpg",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 3.2,
    description:
      "Konzerne konkurrieren darum, den Mars durch Temperatur-, Sauerstoff- und Ozeananstieg bewohnbar zu machen und dabei die meisten Erfolgspunkte zu sammeln.",
    mechanics: ["Kartenmanagement", "Engine Building", "Tableau Building"],
  },
  {
    title: "7 Wonders",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/0b/7_Wonders_-_New_Edition_boxart.png",
    minPlayers: 2,
    maxPlayers: 7,
    playTimeMinutes: 30,
    weight: 2.3,
    description:
      "Als Anführer einer antiken Zivilisation entwickeln die Spieler über drei Zeitalter Handel, Militär und Wissenschaft, um ihr Weltwunder zu errichten.",
    mechanics: ["Drafting", "Kartenmanagement", "Zivilisationsaufbau"],
  },
  {
    title: "Dominion",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b5/Dominion_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 2.3,
    description:
      "Als Herrscher eines kleinen Königreichs bauen die Spieler ihr eigenes Kartendeck mit Aktionen, Geld und Siegpunkten stetig aus.",
    mechanics: ["Deckbuilding", "Kartenmanagement"],
  },
  {
    title: "Puerto Rico",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/6/66/Puerto_Rico_game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 3.3,
    description:
      "Als Plantagenbesitzer in der Kolonialzeit bauen und verschiffen die Spieler Waren wie Zucker, Tabak und Kaffee, um Puerto Rico wirtschaftlich zu entwickeln.",
    mechanics: ["Rollenwahl", "Ressourcenmanagement", "Worker Placement"],
  },
  {
    title: "Agricola",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f6/Agricola_game.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.6,
    description:
      "Als Bauern im 17. Jahrhundert bewirtschaften die Spieler ihren Hof, bauen Felder und Ställe aus und sorgen dafür, dass ihre Familie satt wird.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Kartenmanagement"],
  },
  {
    title: "Scythe",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/1/1a/Scythe_boxart.png",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 115,
    weight: 3.4,
    description:
      "In einem alternativen 1920er-Europa führen die Spieler ihre Fraktion zu wirtschaftlicher und militärischer Vorherrschaft, unterstützt von mächtigen Mechs.",
    mechanics: ["Gebietskontrolle", "Worker Placement", "Ressourcenmanagement"],
  },
  {
    title: "Gloomhaven",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/ee/Gloomhaven_Cover_Art.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.9,
    description:
      "Eine Gruppe von Söldnern erkundet in einer kampagnenartigen Fantasywelt Verliese, kämpft mit einem einzigartigen Kartensystem und schreibt ihre eigene Geschichte.",
    mechanics: ["Kooperativ", "Kampagnenspiel", "Kartenmanagement", "Legacy"],
  },
  {
    title: "Root",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9f/Turn_1_in_board_game_Root.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.1,
    description:
      "Verschiedene Tierfraktionen mit völlig unterschiedlichen Spielregeln kämpfen im Wald um die Vorherrschaft, von der Marquise de Cat bis zur Waldland-Allianz.",
    mechanics: ["Gebietskontrolle", "Asymmetrisches Spiel", "Kartenmanagement"],
  },
  {
    title: "Brass: Birmingham",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.9,
    description:
      "Während der Industriellen Revolution bauen die Spieler in und um Birmingham Fabriken, Kanäle und Eisenbahnen auf, um Handelsnetzwerke aufzubauen und Wohlstand zu erlangen.",
    mechanics: ["Netzwerkbau", "Ressourcenmanagement", "Ökonomie"],
  },
  {
    title: "Everdell",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7b/Components_of_board_game_Everdell.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 80,
    weight: 2.8,
    description:
      "Waldtiere errichten über vier Jahreszeiten eine blühende Stadt, indem sie Ressourcen sammeln, Arbeiter einsetzen und prächtige Gebäude bauen.",
    mechanics: ["Worker Placement", "Tableau Building", "Kartenmanagement"],
  },
  {
    title: "Splendor",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/2/2e/BoardGameSplendorLogoFairUse.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.8,
    description:
      "Als Edelsteinhändler der Renaissance kaufen die Spieler Minen und Handelsrouten, um Entwicklungskarten zu erwerben und Prestige zu sammeln.",
    mechanics: ["Engine Building", "Set Collection", "Kartenmanagement"],
  },
  {
    title: "King of Tokyo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2c/Deskohran%C3%AD_2012_-_6869.JPG",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Als riesige Monster kämpfen die Spieler in Tokyo um Herrschaft, würfeln Angriffe und Energie und sammeln Siegpunkte oder die Kontrolle über die Stadt.",
    mechanics: ["Würfelglück", "Push your luck", "Kampf"],
  },
  {
    title: "Dixit",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Dixitgame.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Ein Spieler gibt einen mehrdeutigen Hinweis zu einer traumhaften Bildkarte, während die anderen raten müssen, welche Karte gemeint ist.",
    mechanics: ["Bluffen", "Kreatives Erzählen", "Mehrheitswahl"],
  },
  {
    title: "Concept",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/1/11/Concept_boardgame_box.png",
    minPlayers: 4,
    maxPlayers: 12,
    playTimeMinutes: 40,
    weight: 1.6,
    description:
      "Mit Symbolwürfeln auf einem gemeinsamen Spielbrett erklären die Spieler Begriffe, ohne Worte zu benutzen, während die anderen erraten müssen, was gemeint ist.",
    mechanics: ["Kooperativ", "Kommunikation ohne Worte", "Raten"],
  },
  {
    title: "Just One",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/6/61/Just_One_box.png",
    minPlayers: 3,
    maxPlayers: 7,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Alle Mitspieler geben verdeckt einen Hinweis zu einem Wort, doppelte Hinweise werden gestrichen, und der ratende Spieler muss anhand der übrigen Hinweise das Wort erraten.",
    mechanics: ["Kooperativ", "Party-Spiel", "Wortassoziation"],
  },
  {
    title: "Sushi Go!",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/98/Sushi_Go%21_box.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 15,
    weight: 1.2,
    description:
      "Die Spieler wählen reihum Sushi-Karten aus einer Hand und geben den Rest weiter, um möglichst clevere Kombinationen aus Maki, Nigiri und Desserts zu sammeln.",
    mechanics: ["Drafting", "Set Collection"],
  },
  {
    title: "Love Letter",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/e1/Love_Letter_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Mit nur 16 Karten versuchen die Spieler, ihren Liebesbrief als Einzige der Prinzessin zu übermitteln, indem sie gegnerische Karten durch Deduktion ausschalten.",
    mechanics: ["Deduktion", "Bluffen", "Kartenmanagement"],
  },
  {
    title: "Skull",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 1.6,
    description:
      "Die Spieler legen verdeckt Blumen- oder Totenkopfkarten und bieten darauf, wie viele Blumenkarten sie aufdecken können, ohne auf einen Totenkopf zu treffen.",
    mechanics: ["Bluffen", "Bieten", "Push your luck"],
  },

  // Batch 2
  {
    title: "Coup",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 15,
    weight: 1.4,
    description:
      "Ein Bluff- und Verhandlungsspiel, bei dem Spieler Charakterkarten mit besonderen Fähigkeiten behaupten zu besitzen, um Gegner aus dem Spiel zu eliminieren.",
    mechanics: ["Bluffen", "Kartenmanagement", "Eliminierung"],
  },
  {
    title: "Bang!",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Bang_box_art.jpg",
    minPlayers: 4,
    maxPlayers: 7,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Ein Wildwest-Kartenspiel mit verdeckten Rollen, in dem Sheriff, Gesetzlose, Vizesheriffs und ein Verräter gegeneinander antreten.",
    mechanics: ["Verdeckte Rollen", "Kartenmanagement", "Bluffen"],
  },
  {
    title: "Munchkin",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/ee/Munchkin_game_cover.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 90,
    weight: 1.9,
    description:
      "Eine humorvolle Parodie auf Dungeon-Crawler-Rollenspiele, bei der Spieler Monster besiegen, Level aufsteigen und sich gegenseitig sabotieren.",
    mechanics: ["Kartenmanagement", "Interaktion", "Humor"],
  },
  {
    title: "Exploding Kittens",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a6/Exploding_Kittens.png",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 15,
    weight: 1.2,
    description:
      "Ein rasantes Kartenspiel im russischen-Roulette-Stil, bei dem Spieler explodierende Katzenkarten vermeiden müssen.",
    mechanics: ["Kartenmanagement", "Bluffen", "Glück"],
  },
  {
    title: "Betrayal at House on the Hill",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5c/Betrayal_at_House_on_the_Hill_setup.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 60,
    weight: 2.2,
    description:
      "Die Spieler erkunden gemeinsam ein sich zufällig aufbauendes Spukhaus, bis ein Ereignis einen von ihnen zum Verräter macht.",
    mechanics: ["Kooperativ", "Legespiel", "Verrat"],
  },
  {
    title: "Arkham Horror",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/ed/Arkham_Horror_revised_box.jpg",
    minPlayers: 1,
    maxPlayers: 8,
    playTimeMinutes: 240,
    weight: 3.2,
    description:
      "Ein kooperatives Horror-Abenteuerspiel im Lovecraft-Universum, in dem Ermittler versuchen, Portale zu schließen, bevor ein Großer Alter erwacht.",
    mechanics: ["Kooperativ", "Würfelglück", "Kartenmanagement"],
  },
  {
    title: "Eldritch Horror",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b7/Eldrich_Horror_board_game_2017.jpg",
    minPlayers: 1,
    maxPlayers: 8,
    playTimeMinutes: 180,
    weight: 3.0,
    description:
      "Ein globales kooperatives Abenteuer im Cthulhu-Mythos, bei dem Ermittler um die Welt reisen, um Mysterien zu lösen und eine Apokalypse zu verhindern.",
    mechanics: ["Kooperativ", "Würfelglück", "Deckbuilding"],
  },
  {
    title: "Mansions of Madness",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/4/4c/Mansions_of_Madness_V2_box.png",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 2.8,
    description:
      "Ein app-gestütztes Horror-Erkundungsspiel, in dem Ermittler ein Anwesen voller übernatürlicher Rätsel und Gefahren durchsuchen.",
    mechanics: ["Kooperativ", "Legespiel", "App-gestützt"],
  },
  {
    title: "Descent: Journeys in the Dark",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/e9/Descent_JITD_Box.JPG",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 2.8,
    description:
      "Ein Dungeon-Crawler, bei dem ein Spieler die Monster steuert, während die anderen als Helden gemeinsam Quests bestreiten.",
    mechanics: ["Worker-vs-Team", "Würfelglück", "Legespiel"],
  },
  {
    title: "Small World",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/7/7f/Small_World_board_game_EN_box.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 80,
    weight: 2.4,
    description:
      "Fantasyvölker kämpfen um Gebiete auf einer zu kleinen Welt, wobei aussterbende Völker rechtzeitig durch neue ersetzt werden müssen.",
    mechanics: ["Gebietskontrolle", "Area-Control", "Zufallsvölker"],
  },
  {
    title: "Ticket to Ride: Europe",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/92/Ticket_to_Ride_Board_Game_Box_EN.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 1.9,
    description:
      "Spieler sammeln Zugkarten, um Eisenbahnstrecken quer durch Europa zu bauen und geheime Zielkarten zu erfüllen.",
    mechanics: ["Set Collection", "Streckenbau", "Kartenmanagement"],
  },
  {
    title: "Star Wars: Rebellion",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/d4/Star_Wars_Rebellion_%28Board_Game%29_Box_Art.png",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 240,
    weight: 3.7,
    description:
      "Ein asymmetrisches Strategiespiel, in dem das Imperium die Rebellenbasis aufspüren muss, während die Rebellion die Galaxis zum Aufstand bewegt.",
    mechanics: ["Asymmetrie", "Gebietskontrolle", "Bluffen"],
  },
  {
    title: "Twilight Struggle",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c1/GMTtwilightStruggle.jpg",
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 180,
    weight: 3.6,
    description:
      "Ein Kartenspiel über den Kalten Krieg, in dem USA und Sowjetunion um Einfluss in der ganzen Welt ringen.",
    mechanics: ["Card-Driven", "Gebietskontrolle", "Bluffen"],
  },
  {
    title: "Through the Ages",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f5/Through_the_Ages%2C_A_Story_of_Civilization_board_game_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 240,
    weight: 4.4,
    description:
      "Ein Zivilisationsaufbauspiel, in dem Spieler über Jahrtausende hinweg Technologien, Wunder und Militär entwickeln.",
    mechanics: ["Worker Placement", "Kartenmanagement", "Zivilisationsaufbau"],
  },
  {
    title: "Great Western Trail",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/68/Great_Western_Trail_ET5A5550_%2828917260350%29.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 3.7,
    description:
      "Spieler treiben Rinderherden von Texas nach Kansas City, bauen Gebäude und optimieren ihr Deck aus Kuhkarten.",
    mechanics: ["Deckbuilding", "Routenbau", "Worker Placement"],
  },
  {
    title: "Viticulture",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 6,
    playTimeMinutes: 90,
    weight: 3.2,
    description:
      "Spieler leiten ein Weingut in der Toskana, pflanzen Reben, produzieren Wein und beliefern Bestellungen über die Jahreszeiten hinweg.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Kartenmanagement"],
  },
  {
    title: "Tzolk'in: The Mayan Calendar",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Tzolk%27in_board_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.5,
    description:
      "Ein Worker-Placement-Spiel um den Maya-Kalender, bei dem Arbeiter auf rotierenden Zahnradscheiben platziert werden.",
    mechanics: ["Worker Placement", "Zahnradmechanik", "Ressourcenmanagement"],
  },
  {
    title: "Caverna: The Cave Farmers",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 7,
    playTimeMinutes: 150,
    weight: 3.6,
    description:
      "Spieler bauen eine Zwergensiedlung in Höhlen aus, betreiben Landwirtschaft, Viehzucht und gehen auf Erkundungsreisen.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Legespiel"],
  },
  {
    title: "Le Havre",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/3e/Le_Havre_game.jpg",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 150,
    weight: 3.7,
    description:
      "Ein Wirtschaftsspiel um den Hafen von Le Havre, in dem Rohstoffe veredelt, Gebäude errichtet und Schiffe gebaut werden.",
    mechanics: [
      "Worker Placement",
      "Ressourcenmanagement",
      "Wirtschaftssimulation",
    ],
  },
  {
    title: "Power Grid",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f0/PGbox_cover_cropped.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 120,
    weight: 3.3,
    description:
      "Spieler ersteigern Kraftwerke, kaufen Rohstoffe und bauen Stromnetze aus, um möglichst viele Städte mit Energie zu versorgen.",
    mechanics: ["Auktion", "Netzwerkbau", "Ressourcenmanagement"],
  },
  {
    title: "Kingdom Death: Monster",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/7/7a/Kingdom_death_monster_logo.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 180,
    weight: 4.0,
    description:
      "Ein düsteres kooperatives Überlebensspiel, in dem eine kleine Siedlung gegen monströse Kreaturen kämpft und über Generationen wächst.",
    mechanics: ["Kooperativ", "Kampagnenspiel", "Miniaturenkampf"],
  },
  {
    title: "Blood Rage",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/5a/Blood_Rage_board_game_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.7,
    description:
      "Wikingerclans kämpfen im mythologischen Ragnarök um Ruhm, indem sie Karten für Angriffe und Aufwertungen einsetzen.",
    mechanics: ["Kartenentwicklung", "Gebietskontrolle", "Deckbuilding"],
  },
  {
    title: "Rising Sun",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b6/Rising_Sun_game.jpg",
    minPlayers: 3,
    maxPlayers: 5,
    playTimeMinutes: 150,
    weight: 3.3,
    description:
      "Rivalisierende Clans im mythischen Japan schließen Bündnisse, verhandeln und kämpfen um die Vorherrschaft.",
    mechanics: ["Verhandlung", "Gebietskontrolle", "Bluffen"],
  },
  {
    title: "Cthulhu Wars",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/56/Robcthulhugame.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.2,
    description:
      "Große Alte kämpfen um die Kontrolle über die Erde, indem sie Kulte verbreiten und die Menschheit dem Wahnsinn näherbringen.",
    mechanics: ["Gebietskontrolle", "Asymmetrie", "Areakontrolle"],
  },
  {
    title: "War of the Ring",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7e/Warofthering.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 180,
    weight: 3.9,
    description:
      "Ein episches Strategiespiel nach Tolkiens Der Herr der Ringe, in dem die Freien Völker gegen die Streitkräfte Saurons antreten.",
    mechanics: ["Asymmetrie", "Gebietskontrolle", "Kartenmanagement"],
  },

  // Batch 3
  {
    title: "A Game of Thrones: The Board Game",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/96/BoardGOT.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 180,
    weight: 3.8,
    description:
      "Strategisches Verhandlungs- und Kriegsspiel im Universum von 'Das Lied von Eis und Feuer', bei dem Spieler als Adelshäuser um die Vorherrschaft in Westeros kämpfen.",
    mechanics: ["Gebietskontrolle", "Verhandlung", "Bluffen", "Area Control"],
  },
  {
    title: "Battlestar Galactica: The Board Game",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/cd/Battlestar_Galactica_The_Board_Game%2C_Cover_Art.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 180,
    weight: 3.7,
    description:
      "Kooperatives Spiel mit verdeckten Verrätern, in dem die Besatzung der Battlestar Galactica ums Überleben kämpft, während Zylonen-Agenten unter ihnen die Mission sabotieren.",
    mechanics: ["Kooperativ", "Verräter-Mechanik", "Bluffen", "Hidden Roles"],
  },
  {
    title: "Dead of Winter",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 3.1,
    description:
      "Semi-kooperatives Survival-Spiel, in dem eine Gruppe Überlebender eine Zombie-Apokalypse bewältigen muss, während jeder Spieler auch geheime persönliche Ziele verfolgt.",
    mechanics: ["Kooperativ", "Verräter-Mechanik", "Ressourcenmanagement"],
  },
  {
    title: "Zombicide",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/6/6a/Zombicide_logo.png",
    minPlayers: 1,
    maxPlayers: 6,
    playTimeMinutes: 60,
    weight: 2.5,
    description:
      "Kooperatives Miniaturenspiel, in dem Überlebende gegen immer größer werdende Zombiehorden kämpfen und dabei Ausrüstung sowie Fähigkeiten verbessern.",
    mechanics: ["Kooperativ", "Miniaturenspiel", "Würfelglück"],
  },
  {
    title: "This War of Mine: The Board Game",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/This_War_of_Mine_board_game_box_cover.webp",
    minPlayers: 1,
    maxPlayers: 6,
    playTimeMinutes: 150,
    weight: 3.6,
    description:
      "Bedrückendes Survival-Spiel über Zivilisten in einer belagerten Stadt, das moralische Entscheidungen und das tägliche Überleben im Krieg thematisiert.",
    mechanics: ["Kooperativ", "Ressourcenmanagement", "Storytelling"],
  },
  {
    title: "Nemesis",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/83/Playing_board_game_-_Play_213_1681550178485.jpg",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 3.9,
    description:
      "Science-Fiction-Horrorspiel auf einem havarierten Raumschiff, in dem Spieler mit versteckten Zielen kooperieren und gegen tödliche Alien-Kreaturen ums Überleben kämpfen.",
    mechanics: ["Semi-Kooperativ", "Verräter-Mechanik", "Bluffen"],
  },
  {
    title: "Mysterium",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/5e/Mysterium_board_game_cover.jpg",
    minPlayers: 2,
    maxPlayers: 7,
    playTimeMinutes: 42,
    weight: 1.9,
    description:
      "Kooperatives Krimispiel, bei dem ein stummer Geist seinen Mitspielern mit surrealen Traumkarten Hinweise gibt, um einen Mordfall aufzuklären.",
    mechanics: ["Kooperativ", "Deduktion", "Kartenmanagement"],
  },
  {
    title: "Sherlock Holmes Consulting Detective",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/34/Sherlock_Holmes_-_Consulting_Detective_Coverart.png",
    minPlayers: 1,
    maxPlayers: 8,
    playTimeMinutes: 90,
    weight: 2.1,
    description:
      "Kooperatives Ermittlungsspiel, bei dem Spieler als Detektive Londons Straßen und Zeitungsartikel durchsuchen, um knifflige Kriminalfälle zu lösen.",
    mechanics: ["Kooperativ", "Deduktion", "Storytelling"],
  },
  {
    title: "Pandemic Legacy: Season 1",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/Pandemic_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: 2.8,
    description:
      "Kampagnenbasierte Weiterentwicklung von Pandemic, bei der Spieler über zwölf Spielsitzungen hinweg eine sich dauerhaft verändernde Welt vor globalen Seuchen retten.",
    mechanics: ["Kooperativ", "Legacy", "Deckbuilding"],
  },
  {
    title: "Clank!: A Deck-Building Adventure",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: 2.3,
    description:
      "Deckbuilding-Abenteuerspiel, bei dem Spieler heimlich in den Bergfried eines Drachen eindringen, um Schätze zu stehlen und möglichst leise wieder zu entkommen.",
    mechanics: ["Deckbuilding", "Push your luck", "Gebietsbewegung"],
  },
  {
    title: "Yokohama",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 100,
    weight: 3.7,
    description:
      "Strategisches Worker-Placement-Spiel im Yokohama der Meiji-Zeit, in dem Spieler Handelsrouten aufbauen, Rohstoffe verarbeiten und Verträge erfüllen.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Routenbau"],
  },
  {
    title: "Tokaido",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/23/Cmglee_Tokaido_board_game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 1.6,
    description:
      "Entspanntes Reisespiel entlang der japanischen Küstenstraße Tōkaidō, bei dem Spieler unterwegs Erlebnisse sammeln statt möglichst schnell ans Ziel zu gelangen.",
    mechanics: ["Set Collection", "Push your luck", "Streckenbewegung"],
  },
  {
    title: "Photosynthesis",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/97/A_game_of_Photosynthesis_in_progress.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.2,
    description:
      "Legespiel um wachsende Bäume, bei dem die Position der Sonne über Schatten und Wachstum entscheidet und Spieler ihren Wald strategisch ausbauen.",
    mechanics: ["Legespiel", "Ressourcenmanagement", "Bauen"],
  },
  {
    title: "Cascadia",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/7/79/Cascadia_box_cover.JPG",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.8,
    description:
      "Puzzle-Legespiel, bei dem Spieler Landschafts- und Wildtierplättchen des pazifischen Nordwestens zu einem naturnahen Habitat kombinieren.",
    mechanics: ["Legespiel", "Puzzle", "Musterbildung"],
  },
  {
    title: "Calico",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4b/Playing_board_game_-_Play_1060_1724585405829.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Puzzle-Legespiel, bei dem Spieler bunte Stoffmuster für eine Katzendecke legen und dabei Katzen sowie Knopfmuster gleichzeitig bedienen müssen.",
    mechanics: ["Legespiel", "Puzzle", "Musterbildung"],
  },
  {
    title: "Parks",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 2.0,
    description:
      "Wanderspiel durch die US-Nationalparks, bei dem Spieler auf einem gemeinsamen Pfad vorrücken, Ressourcen sammeln und Erinnerungsstücke einlösen.",
    mechanics: ["Worker Placement", "Set Collection", "Kartenmanagement"],
  },
  {
    title: "Patchwork",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Zwei-Personen-Puzzlespiel, bei dem Spieler Stoffstücke effizient auf ihr eigenes Quilt-Brett legen, um Knöpfe zu sammeln und Lücken zu vermeiden.",
    mechanics: ["Puzzle", "Legespiel", "Tetris-Mechanik"],
  },
  {
    title: "Kingdomino",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a3/Kingdomino_Box_Cover.png",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Einfaches Legespiel im Domino-Stil, bei dem Spieler Landschaftskacheln auswählen und anlegen, um ihr eigenes Königreich möglichst wertvoll zu gestalten.",
    mechanics: ["Legespiel", "Drafting", "Gebietsbau"],
  },
  {
    title: "Queendomino",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5e/Elements_queendomino_1640280358650.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Erweiterte eigenständige Version von Kingdomino mit Rittern, Türmen und einer Wirtschaftskomponente, bei der Spieler ihr Königreich weiter ausbauen.",
    mechanics: ["Legespiel", "Drafting", "Gebietsbau"],
  },
  {
    title: "Azul: Summer Pavilion",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Eigenständige Fortsetzung von Azul mit sechseckigem Spielplan, bei der Spieler Fliesen verschiedener Farben sammeln, um kunstvolle Sternmuster zu vervollständigen.",
    mechanics: ["Legespiel", "Drafting", "Musterbildung"],
  },
  {
    title: "Azul: Stained Glass of Sintra",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Azul_-_Stained_Glass_of_Sintra.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Eigenständige Fortsetzung von Azul mit doppelseitigen Glasfenstern, bei der Spieler Fliesen doppelseitig drapieren und dabei zerbrochene Stücke vermeiden.",
    mechanics: ["Legespiel", "Drafting", "Musterbildung"],
  },
  {
    title: "Sagrada",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4e/A_nearly_complete_window_in_Sagrada.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.9,
    description:
      "Würfel-Legespiel, bei dem Spieler bunte Würfel nach Farb- und Wertregeln anordnen, um ein Kirchenfenster im Stil der Sagrada Família zu gestalten.",
    mechanics: ["Legespiel", "Würfelglück", "Drafting"],
  },
  {
    title: "Santorini",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/ec/Santorini_game_render.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 20,
    weight: 1.7,
    description:
      "Abstraktes Bauspiel, bei dem Spieler Türme errichten und ihre Figuren darauf bewegen, um als Erste die dritte Ebene eines Gebäudes zu erreichen.",
    mechanics: ["Abstraktes Spiel", "Bauen", "Taktik"],
  },
  {
    title: "Onitama",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/95/Onitama_02.jpg",
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 15,
    weight: 1.6,
    description:
      "Abstraktes Zwei-Personen-Strategiespiel im Stil japanischer Kampfkunst, bei dem Bewegungskarten festlegen, wie die eigenen Meister und Schüler ziehen dürfen.",
    mechanics: ["Abstraktes Spiel", "Kartenmanagement", "Taktik"],
  },
  {
    title: "Hive",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7d/Hive_%28Carbon_Edition%29_Game.jpg",
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 20,
    weight: 2.1,
    description:
      "Abstraktes Legespiel ohne Spielbrett, bei dem Spieler mit sechseckigen Insektensteinen die gegnerische Bienenkönigin vollständig umschließen müssen.",
    mechanics: ["Abstraktes Spiel", "Legespiel", "Taktik"],
  },

  // Batch 4
  {
    title: "Ingenious",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/be/Mensa_Connections.JPG",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.8,
    description:
      "Abstraktes Legespiel von Reiner Knizia, bei dem sechseckige Spielsteine mit farbigen Symbolen angelegt werden, um Punktereihen zu bilden. Gewonnen hat, wer in seiner schwächsten Farbe am besten dasteht.",
    mechanics: ["Legespiel", "Mustererkennung", "Punkteoptimierung"],
  },
  {
    title: "Qwirkle",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/97/Qwirkle_Box.png",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.2,
    description:
      "Legespiel mit Holzsteinen in verschiedenen Farben und Formen, bei dem passende Reihen gebildet werden, ähnlich einer Mischung aus Domino und Scrabble.",
    mechanics: ["Legespiel", "Mustererkennung", "Setzen"],
  },
  {
    title: "Carcassonne: Hunters and Gatherers",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d1/Deskohran%C3%AD_08-10-05_054.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Eigenständige Steinzeit-Variante von Carcassonne, bei der Landschaftsplättchen mit Wäldern, Flüssen und Wildtieren statt Städten und Straßen gelegt werden.",
    mechanics: ["Legespiel", "Gebietskontrolle", "Setzen"],
  },
  {
    title: "Catan: Cities & Knights",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.1,
    description:
      "Erweiterung für Die Siedler von Catan, die Städteausbau, Rittersteine zur Verteidigung gegen Barbaren und Fortschrittskarten einführt und das Spiel deutlich strategischer macht.",
    mechanics: ["Gebietskontrolle", "Ressourcenmanagement", "Würfelglück"],
  },
  {
    title: "Catan: Seafarers",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/Seafarers_of_Catan_-_Midgame.jpg",
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.9,
    description:
      "Erweiterung für Die Siedler von Catan, bei der die Spieler mit Schiffen neue Inseln erkunden und besiedeln, um Gold und weitere Ressourcen zu erschließen.",
    mechanics: ["Gebietskontrolle", "Ressourcenmanagement", "Erkundung"],
  },
  {
    title: "Risk",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8c/Amsterdam_-_Risk_players_-_1136_%28cropped%29.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 120,
    weight: 2.2,
    description:
      "Klassisches Kriegs- und Eroberungsspiel, bei dem Spieler mit Armeen auf einer Weltkarte um Territorien kämpfen und Kontinente erobern.",
    mechanics: ["Gebietskontrolle", "Würfelglück", "Bluffen"],
  },
  {
    title: "Monopoly",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/78/Monopoly_board_on_white_bg.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 120,
    weight: 1.7,
    description:
      "Bekanntes Wirtschaftsspiel, bei dem Spieler Straßen und Grundstücke kaufen, Häuser bauen und Miete kassieren, um ihre Gegner in den Bankrott zu treiben.",
    mechanics: ["Würfelglück", "Handel", "Wirtschaftssimulation"],
  },
  {
    title: "Cluedo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4c/Cluedo_Clue_pack_logo.png",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 1.9,
    description:
      "Detektiv-Gesellschaftsspiel, bei dem die Spieler durch Ausschlussverfahren herausfinden müssen, wer mit welcher Waffe in welchem Raum den Mord begangen hat.",
    mechanics: ["Deduktion", "Bluffen", "Würfelglück"],
  },
  {
    title: "Scrabble",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5d/Scrabble_game_in_progress.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: 1.7,
    description:
      "Wortspiel, bei dem Spieler aus Buchstabensteinen Wörter auf einem Raster legen und dafür Punkte je nach Buchstabenwert und Sonderfeld erhalten.",
    mechanics: ["Wortbildung", "Punkteoptimierung", "Legespiel"],
  },
  {
    title: "Trivial Pursuit",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7d/Trivial_pursuit_classic_edition_cover.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 90,
    weight: 1.6,
    description:
      "Quizspiel, bei dem Spieler Fragen aus verschiedenen Wissenskategorien beantworten und dafür Tortenstücke sammeln, um als Erster das Spielfeld zu vervollständigen.",
    mechanics: ["Quiz", "Würfelglück", "Wissensabfrage"],
  },
  {
    title: "Uno",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/f9/UNO_Logo.svg",
    minPlayers: 2,
    maxPlayers: 10,
    playTimeMinutes: 30,
    weight: 1.1,
    description:
      "Beliebtes Kartenspiel, bei dem Spieler ihre Handkarten passend zu Farbe oder Zahl ablegen und mit Sonderkarten wie Farbwechsel oder Ziehkarten Mitspieler behindern.",
    mechanics: ["Kartenmanagement", "Ablegen", "Glück"],
  },
  {
    title: "Skip-Bo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/8/8d/Skip-Bo_cover.JPG",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 1.4,
    description:
      "Kartenspiel, bei dem Spieler ihren Stapel möglichst schnell durch das Anlegen fortlaufender Zahlenfolgen in der Tischmitte abbauen müssen.",
    mechanics: ["Kartenmanagement", "Sequenzbildung", "Glück"],
  },
  {
    title: "Phase 10",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e3/Phase_10.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 60,
    weight: 1.5,
    description:
      "Kartenspiel, bei dem Spieler zehn unterschiedliche Kombinationen (Phasen) aus Zahlen- und Farbkarten erfüllen müssen, um als Erster alle Phasen abzuschließen.",
    mechanics: ["Kartenmanagement", "Sequenzbildung", "Glück"],
  },
  {
    title: "Rummikub",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b1/Rummikub_Tiles.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.9,
    description:
      "Legespiel mit nummerierten Spielsteinen, bei dem Reihen und Gruppen gebildet und bereits ausliegende Kombinationen geschickt umsortiert werden, um alle eigenen Steine loszuwerden.",
    mechanics: ["Legespiel", "Kombinatorik", "Taktik"],
  },
  {
    title: "Yahtzee",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Original_Yahtzee_game_set_-_1980s_UK_release.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Würfelspiel, bei dem mit fünf Würfeln in bis zu drei Würfen pro Runde bestimmte Kombinationen wie Drillinge, Straßen oder ein Yahtzee erzielt werden müssen.",
    mechanics: ["Würfelglück", "Punkteoptimierung", "Risikoabwägung"],
  },
  {
    title: "Taboo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/19/Taboo_02.jpg",
    minPlayers: 4,
    maxPlayers: 10,
    playTimeMinutes: 45,
    weight: 1.3,
    description:
      "Partyspiel, bei dem Begriffe erklärt werden müssen, ohne dabei bestimmte verbotene Wörter zu verwenden, während das gegnerische Team auf Verstöße achtet.",
    mechanics: ["Kommunikation", "Zeitdruck", "Teamspiel"],
  },
  {
    title: "Pictionary",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5d/Pictionary_Party.jpg",
    minPlayers: 3,
    maxPlayers: 16,
    playTimeMinutes: 60,
    weight: 1.2,
    description:
      "Zeichenspiel, bei dem Spieler Begriffe zeichnerisch darstellen und ihr Team den gesuchten Begriff möglichst schnell erraten muss.",
    mechanics: ["Zeichnen", "Zeitdruck", "Teamspiel"],
  },
  {
    title: "Codenames: Duet",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d5/Codenames_Duet.jpg",
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 15,
    weight: 1.7,
    description:
      "Kooperative Zweispieler-Variante von Codenames, bei der beide Spieler abwechselnd Hinweise geben, um gemeinsam alle Agentenkarten zu finden, ohne den Attentäter zu treffen.",
    mechanics: ["Wortassoziation", "Kooperativ", "Deduktion"],
  },
  {
    title: "Decrypto",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 8,
    playTimeMinutes: 45,
    weight: 1.9,
    description:
      "Team-Spionagespiel, bei dem Spieler codierte Hinweise geben, damit das eigene Team Zahlencodes entschlüsselt, während das gegnerische Team versucht mitzuhören.",
    mechanics: ["Wortassoziation", "Bluffen", "Teamspiel"],
  },
  {
    title: "Wavelength",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b0/The_Wavelength_party_game_box_and_elements_01.jpg",
    minPlayers: 2,
    maxPlayers: 12,
    playTimeMinutes: 45,
    weight: 1.4,
    description:
      "Partyspiel, bei dem ein Spieler versucht, sein Team über einen verdeckten Zeiger auf einer Skala zwischen zwei Gegensätzen zu lenken, indem er passende Hinweise gibt.",
    mechanics: ["Kommunikation", "Teamspiel", "Assoziation"],
  },
  {
    title: "The Mind",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 20,
    weight: 1.1,
    description:
      "Kooperatives Kartenspiel, bei dem Spieler ohne zu sprechen Karten in aufsteigender Reihenfolge ausspielen müssen und sich dabei rein auf Intuition und Timing verlassen.",
    mechanics: ["Kooperativ", "Timing", "Kartenmanagement"],
  },
  {
    title: "The Crew: The Quest for Planet Nine",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 20,
    weight: 1.9,
    description:
      "Kooperatives Stichspiel im Weltraum-Thema, bei dem das Team über mehrere Missionen hinweg gemeinsam festgelegte Stichziele erfüllen muss, ohne offen zu kommunizieren.",
    mechanics: ["Kooperativ", "Stichspiel", "Kommunikation"],
  },
  {
    title: "Hanabi",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b1/Hanabi_cover.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 25,
    weight: 1.8,
    description:
      "Kooperatives Kartenspiel, bei dem Spieler ihre eigenen Karten nicht sehen können und sich gegenseitig begrenzte Hinweise geben müssen, um ein Feuerwerk in der richtigen Reihenfolge zu legen.",
    mechanics: ["Kooperativ", "Deduktion", "Kartenmanagement"],
  },
  {
    title: "Forbidden Island",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/b/b0/Forbidden_Island_game_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.8,
    description:
      "Kooperatives Abenteuerspiel, bei dem die Spieler gemeinsam vier Schätze bergen müssen, bevor die versinkende Insel komplett im Meer verschwindet.",
    mechanics: ["Kooperativ", "Legespiel", "Risikomanagement"],
  },
  {
    title: "Forbidden Desert",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8c/Forbidden_Desert_board_game_layout.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 2.1,
    description:
      "Kooperatives Überlebensspiel in der Wüste, bei dem die Spieler Teile eines abgestürzten Flugschiffs bergen müssen, während Sandstürme das Spielfeld ständig verändern.",
    mechanics: ["Kooperativ", "Ressourcenmanagement", "Erkundung"],
  },

  // Batch 5
  {
    title: "Flash Point: Fire Rescue",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/4/4b/Flash_Point_Fire_Rescue_board_game_cover.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 1.8,
    description:
      "Kooperatives Spiel, in dem die Spieler als Feuerwehrleute ein brennendes Gebäude durchsuchen, Bewohner retten und Brände löschen müssen, bevor das Haus einstürzt.",
    mechanics: ["Kooperativ", "Würfelglück", "Aktionspunkte"],
  },
  {
    title: "Pandemic: Iberia",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/Pandemic_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: 2.4,
    description:
      "Eigenständige Pandemic-Umsetzung auf der Iberischen Halbinsel, in der die Spieler kooperativ Krankheiten bekämpfen und zusätzlich den Zugang zu sauberem Wasser sichern müssen.",
    mechanics: ["Kooperativ", "Gebietskontrolle", "Handkartenmanagement"],
  },
  {
    title: "Spirit Island",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d6/Game_in_progress%2C_Spirit_Island.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 4.0,
    description:
      "Kooperatives Spiel, in dem mächtige Geister eine Insel gegen europäische Kolonisten verteidigen, indem sie ihre Kräfte kombinieren und die Landschaft verändern.",
    mechanics: ["Kooperativ", "Kartenmanagement", "Gebietskontrolle"],
  },
  {
    title: "Root: The Underworld Expansion",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9f/Turn_1_in_board_game_Root.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 90,
    weight: 3.7,
    description:
      "Erweiterung zum asymmetrischen Gebietskontrollspiel Root, die neue Fraktionen und Karten rund um ein geheimnisvolles Höhlensystem hinzufügt.",
    mechanics: ["Asymmetrie", "Gebietskontrolle", "Kartenmanagement"],
  },
  {
    title: "Terra Mystica",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/6a/Terra_Mystica_-_detail.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 150,
    weight: 3.9,
    description:
      "Strategisches Aufbauspiel, in dem 14 asymmetrische Völker um Landschaft, Ressourcen und Kulte auf einer fantastischen Landkarte konkurrieren.",
    mechanics: ["Gebietskontrolle", "Asymmetrie", "Ressourcenmanagement"],
  },
  {
    title: "Barrage",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/40/Playing_board_game_-_Play_772_1710099142730.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 4.0,
    description:
      "Wirtschaftsstrategiespiel, in dem rivalisierende Energiekonzerne im frühen 20. Jahrhundert Staudämme und Wasserkraftwerke bauen, um Strom zu erzeugen.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Interaktion"],
  },
  {
    title: "Anachrony",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 3.9,
    description:
      "Science-Fiction-Worker-Placement-Spiel nach einer Apokalypse, in dem Spieler mittels Zeitreisen Fehler der Vergangenheit korrigieren, um den Wiederaufbau der Menschheit zu sichern.",
    mechanics: [
      "Worker Placement",
      "Zeitreise-Mechanik",
      "Ressourcenmanagement",
    ],
  },
  {
    title: "On Mars",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 180,
    weight: 4.4,
    description:
      "Komplexes Aufbauspiel von Vital Lacerda, in dem Teams eine Kolonie auf dem Mars errichten und dabei Produktion, Logistik und Ressourcen meistern müssen.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Logistik"],
  },
  {
    title: "Lisboa",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 4.2,
    description:
      "Wirtschaftsspiel über den Wiederaufbau Lissabons nach dem verheerenden Erdbeben von 1755, mit tiefem Engine-Building und Handelsmechanismen.",
    mechanics: ["Engine Building", "Ressourcenmanagement", "Handel"],
  },
  {
    title: "Brass: Lancashire",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.9,
    description:
      "Wirtschaftsspiel über die industrielle Revolution in Lancashire, in dem Spieler Netzwerke aus Fabriken und Transportwegen über zwei Epochen aufbauen.",
    mechanics: ["Netzwerkbau", "Ressourcenmanagement", "Wirtschaftssimulation"],
  },
  {
    title: "Concordia",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/98/Playing_board_game_-_Play_1824_1763202284392.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 100,
    weight: 2.7,
    description:
      "Handels- und Aufbauspiel im Römischen Reich, bei dem Karten anstelle eines Rondells die Aktionen der Spieler steuern.",
    mechanics: ["Kartenmanagement", "Handel", "Routenbau"],
  },
  {
    title: "Roll for the Galaxy",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 2.9,
    description:
      "Würfelversion von Race for the Galaxy, in der Spieler mit Würfeln als Arbeitern Planeten besiedeln und Entwicklungen erforschen, um ein galaktisches Imperium aufzubauen.",
    mechanics: ["Würfelglück", "Engine Building", "Verdecktes Bieten"],
  },
  {
    title: "Race for the Galaxy",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/1/1c/Rftg_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 3.0,
    description:
      "Kartenspiel, in dem Spieler mit Handkarten verdeckt Aktionen wählen, um Planeten zu besiedeln und Entwicklungen zu errichten und so ein galaktisches Imperium aufzubauen.",
    mechanics: ["Verdecktes Bieten", "Kartenmanagement", "Engine Building"],
  },
  {
    title: "San Juan",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c7/San_Juan_cradgame.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.1,
    description:
      "Kartenspiel-Adaption von Puerto Rico, in dem Spieler Gebäude errichten und Rollen wählen, um ihre Produktion und Wirtschaft in der Kolonialstadt San Juan auszubauen.",
    mechanics: ["Rollenwahl", "Kartenmanagement", "Ressourcenmanagement"],
  },
  {
    title: "El Grande",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/b/b5/El_Grande.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 120,
    weight: 3.0,
    description:
      "Klassisches Mehrheitenspiel im Spanien der Renaissance, bei dem Spieler mit Caballeros um die Kontrolle einzelner Provinzen ringen.",
    mechanics: ["Gebietskontrolle", "Mehrheitenbildung", "Kartenmanagement"],
  },
  {
    title: "Tigris and Euphrates",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e7/Deskohran%C3%AD_2008_0109.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.3,
    description:
      "Legespiel von Reiner Knizia im antiken Mesopotamien, bei dem Spieler Zivilisationen in vier Kategorien ausbalanciert entwickeln müssen, um Konflikte zu gewinnen.",
    mechanics: ["Legespiel", "Gebietskontrolle", "Mehrheitenbildung"],
  },
  {
    title: "Ra",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/5/53/Ra_game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 2.3,
    description:
      "Auktionsspiel im alten Ägypten, in dem Spieler in mehreren Runden Plättchen ersteigern, um Sonnenlauf-Punkte in verschiedenen Kategorien zu sammeln.",
    mechanics: ["Bieten", "Setsammeln", "Zufallselement"],
  },
  {
    title: "Modern Art",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 2.4,
    description:
      "Auktionsspiel, in dem Spieler als Kunsthändler Gemälde fiktiver Künstler kaufen und verkaufen, um am Ende möglichst viel Vermögen zu besitzen.",
    mechanics: ["Bieten", "Verhandeln", "Marktmechanik"],
  },
  {
    title: "Medici",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/9/9e/Medici_game.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 2.1,
    description:
      "Auktionsspiel im Handelsmilieu der Renaissance, bei dem Spieler Warenschiffe ersteigern und beladen, um am Ende die wertvollste Fracht zu besitzen.",
    mechanics: ["Bieten", "Setsammeln", "Ressourcenmanagement"],
  },
  {
    title: "Bohnanza",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/92/Bohnanza_game_box_art.jpeg",
    minPlayers: 2,
    maxPlayers: 7,
    playTimeMinutes: 45,
    weight: 1.7,
    description:
      "Handelskartenspiel, in dem Spieler verschiedene Bohnensorten anbauen und geschickt untereinander tauschen müssen, um möglichst viel Gewinn zu erzielen.",
    mechanics: ["Handeln", "Kartenmanagement", "Setsammeln"],
  },
  {
    title: "6 Nimmt!",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/56/6_nimmt%21.jpg",
    minPlayers: 2,
    maxPlayers: 10,
    playTimeMinutes: 45,
    weight: 1.3,
    description:
      "Kartenlegespiel, bei dem Spieler gleichzeitig Karten in vier Reihen anlegen und versuchen, keine Reihe mit der sechsten Karte füllen zu müssen, um Minuspunkte zu vermeiden.",
    mechanics: ["Kartenlegen", "Gleichzeitiges Ausspielen", "Bluffen"],
  },
  {
    title: "No Thanks!",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b8/No_Thanks%21.jpg",
    minPlayers: 3,
    maxPlayers: 7,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Einfaches Kartenspiel, bei dem Spieler Zahlenkarten entweder nehmen oder mit einem Chip ablehnen müssen, um am Ende möglichst wenige Minuspunkte zu haben.",
    mechanics: ["Push your luck", "Kartenmanagement", "Chipsetzen"],
  },
  {
    title: "For Sale",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.4,
    description:
      "Zweiteiliges Auktionsspiel, in dem Spieler zunächst Häuser ersteigern und diese anschließend meistbietend weiterverkaufen, um möglichst viel Geld zu verdienen.",
    mechanics: ["Bieten", "Verkaufen", "Zufallselement"],
  },
  {
    title: "Coloretto",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/85/Coloretto_01.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Kartenspiel, bei dem Spieler Farbkarten auf Fahrzeuge verteilen oder sich diese nehmen, um am Ende möglichst wertvolle Farbsammlungen zu besitzen.",
    mechanics: ["Setsammeln", "Bluffen", "Push your luck"],
  },
  {
    title: "Zombie Dice",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/46/Zombie_Dice.jpg",
    minPlayers: 2,
    maxPlayers: 99,
    playTimeMinutes: 20,
    weight: 1.1,
    description:
      "Schnelles Würfelspiel, bei dem Spieler als Zombies Gehirne fressen, dabei aber das Risiko abwägen müssen, von Schrotflinten getroffen zu werden.",
    mechanics: ["Push your luck", "Würfelglück", "Party-Spiel"],
  },

  // Batch 6
  {
    title: "King of New York",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/King_of_new_york_ver1.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 90,
    weight: 2.2,
    description:
      "Als Monster kämpfst du dich durch New York, sammelst Ruhm und Energie und lieferst dir Duelle mit dem Militär, während du versuchst, berühmt oder König der Stadt zu werden.",
    mechanics: ["Würfelglück", "Areal-Kontrolle", "Take That"],
  },
  {
    title: "Machi Koro",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/58/Machi_Koro_US_Cover_IDW_Panadsaurus.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.4,
    description:
      "In diesem Städtebau-Würfelspiel errichten Spieler Gebäude, um Einkommen zu generieren und als Erste alle Wahrzeichen ihrer Stadt fertigzustellen.",
    mechanics: ["Würfelglück", "Engine Building", "Kartenmanagement"],
  },
  {
    title: "Sushi Go Party!",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/98/Sushi_Go%21_box.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 20,
    weight: 1.3,
    description:
      "Die große Party-Version von Sushi Go!: Spieler wählen aus deutlich mehr Kartentypen und stellen ihr eigenes Menü aus Sushi-Kombinationen zusammen.",
    mechanics: ["Drafting", "Kartenmanagement", "Set Collection"],
  },
  {
    title: "Fluxx",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/39/FluxxEN-DE-FU.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.3,
    description:
      "Ein Kartenspiel mit ständig wechselnden Regeln und Siegbedingungen, bei dem jede gespielte Karte das Spielgeschehen neu definiert.",
    mechanics: ["Kartenmanagement", "Regeländerung", "Chaos"],
  },
  {
    title: "Set",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8f/Set-game-cards.png",
    minPlayers: 1,
    maxPlayers: 20,
    playTimeMinutes: 15,
    weight: 1.5,
    description:
      "Ein schnelles Mustererkennungsspiel, bei dem Spieler gleichzeitig nach Kartensätzen mit übereinstimmenden oder komplett unterschiedlichen Merkmalen suchen.",
    mechanics: ["Echtzeit", "Mustererkennung", "Kartenmanagement"],
  },
  {
    title: "Dobble",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/84/Dobble_jeu.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 15,
    weight: 1.1,
    description:
      "Auf jeder Karte gibt es genau ein gemeinsames Symbol mit jeder anderen Karte, das die Spieler in verschiedenen Minispielen so schnell wie möglich finden müssen.",
    mechanics: ["Reaktionsspiel", "Mustererkennung", "Echtzeit"],
  },
  {
    title: "Ubongo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/85/Hry_a_hlavolamy_2008_-_Ubongo_2.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 25,
    weight: 1.6,
    description:
      "Ein Legespiel gegen die Uhr, bei dem Spieler geometrische Teile möglichst schnell in eine vorgegebene Fläche einpassen müssen, um Edelsteine zu gewinnen.",
    mechanics: ["Legespiel", "Echtzeit", "Puzzle"],
  },
  {
    title: "Rush Hour",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/9d/Rush_Hour_sliding_block_puzzle.jpg",
    minPlayers: 1,
    maxPlayers: 1,
    playTimeMinutes: 15,
    weight: 1.8,
    description:
      "Ein Solo-Schiebepuzzle, bei dem Autos und Lastwagen auf einem Raster verschoben werden müssen, damit das rote Fluchtauto den Stau verlassen kann.",
    mechanics: ["Legespiel", "Solo-Puzzle", "Logikrätsel"],
  },
  {
    title: "Labyrinth",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/dd/Amazing_Labyrinth_game_box.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 30,
    weight: 1.5,
    description:
      "Spieler verschieben Gangkarten in einem sich ständig verändernden Labyrinth, um Schätze einzusammeln, bevor die Gegner es tun.",
    mechanics: ["Legespiel", "Tile-Placement", "Taktik"],
  },
  {
    title: "Ricochet Robots",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/75/Ricochet_Robot_1.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Spieler suchen gleichzeitig nach dem kürzesten Weg, um einen Roboter über Abpraller an Wänden und anderen Robotern zu seinem Ziel zu lenken.",
    mechanics: ["Echtzeit", "Logikrätsel", "Bewegungsplanung"],
  },
  {
    title: "Geistesblitz",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/98/Geistesblitz_03.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 15,
    weight: 1.1,
    description:
      "Ein Reaktionsspiel, bei dem Spieler anhand von Farbe und Form auf einer Karte blitzschnell die richtige Figur ergreifen müssen.",
    mechanics: ["Reaktionsspiel", "Echtzeit", "Mustererkennung"],
  },
  {
    title: "Halli Galli",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/aa/Halli_Galli.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 20,
    weight: 1.0,
    description:
      "Sobald auf den aufgedeckten Fruchtkarten fünf gleiche Früchte zu sehen sind, muss so schnell wie möglich die Klingel geschlagen werden.",
    mechanics: ["Reaktionsspiel", "Echtzeit", "Kartenmanagement"],
  },
  {
    title: "Jungle Speed",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/f/fc/Jungle_Speed.jpg",
    minPlayers: 2,
    maxPlayers: 10,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Bei passenden Symbolen auf den aufgedeckten Karten müssen die Spieler blitzschnell nach dem Totem greifen, um Karten loszuwerden.",
    mechanics: ["Reaktionsspiel", "Echtzeit", "Geschicklichkeit"],
  },
  {
    title: "The Resistance: Avalon",
    imageUrl: null,
    minPlayers: 5,
    maxPlayers: 10,
    playTimeMinutes: 30,
    weight: 2.0,
    description:
      "In der Welt von Camelot kämpfen loyale Ritter verdeckt gegen Agenten von Mordred, wobei Bluffen und Deduktion über Sieg oder Niederlage entscheiden.",
    mechanics: ["Bluffen", "Soziale Deduktion", "Verdeckte Rollen"],
  },
  {
    title: "Secret Hitler",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/89/Secret_Hitler.svg",
    minPlayers: 5,
    maxPlayers: 10,
    playTimeMinutes: 45,
    weight: 2.1,
    description:
      "Liberale und Faschisten kämpfen verdeckt um die Kontrolle der Regierung, während Misstrauen und Bluffen das gesamte Spiel bestimmen.",
    mechanics: ["Bluffen", "Soziale Deduktion", "Verdeckte Rollen"],
  },
  {
    title: "Ultimate Werewolf",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/f3/Ultimate_Werewold_board_game_cover_art_2017.png",
    minPlayers: 5,
    maxPlayers: 75,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Dorfbewohner versuchen nachts von Werwölfen gejagt zu werden und tagsüber durch Diskussion und Bluffen herauszufinden, wer die Werwölfe unter ihnen sind.",
    mechanics: ["Bluffen", "Soziale Deduktion", "Verdeckte Rollen"],
  },
  {
    title: "Deception: Murder in Hong Kong",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/0a/GFG-Deception.jpg",
    minPlayers: 4,
    maxPlayers: 12,
    playTimeMinutes: 20,
    weight: 2.0,
    description:
      "Ein forensischer Wissenschaftler gibt stumme Hinweise mittels Beweiskarten, damit die anderen Spieler den verdeckten Mörder unter sich identifizieren können.",
    mechanics: ["Kooperativ", "Bluffen", "Deduktion"],
  },
  {
    title: "Mysterium Park",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 7,
    playTimeMinutes: 42,
    weight: 1.9,
    description:
      "Ein Geist versucht seinen Mördern durch surreale Traumbilder Hinweise zu geben, während die Medien gemeinsam den Mordfall aufklären müssen.",
    mechanics: ["Kooperativ", "Deduktion", "Kartenmanagement"],
  },
  {
    title: "Dixit Odyssey",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Dixitgame.jpg",
    minPlayers: 3,
    maxPlayers: 12,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Eine Erweiterung des Erzähl- und Assoziationsspiels Dixit für größere Gruppen, bei dem Spieler mit poetischen Hinweisen zu Traumbildern raten.",
    mechanics: ["Storytelling", "Bluffen", "Assoziation"],
  },
  {
    title: "Trapwords",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 8,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Teams müssen einem Mitspieler einen Begriff erklären, ohne dabei auf ein vom gegnerischen Team gelegtes Wortfeld aus verbotenen Wörtern zu treten.",
    mechanics: ["Kooperativ", "Team vs. Team", "Wortspiel"],
  },
  {
    title: "The Fake Artist Goes to New York",
    imageUrl: null,
    minPlayers: 5,
    maxPlayers: 10,
    playTimeMinutes: 20,
    weight: 1.3,
    description:
      "Alle Spieler zeichnen reihum an einem gemeinsamen Bild mit, doch ein Spieler kennt das Motiv nicht und muss unentdeckt bleiben.",
    mechanics: ["Bluffen", "Zeichnen", "Soziale Deduktion"],
  },
  {
    title: "Telestrations",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/50/Telestrations_party_game_of_drawing_and_guessing_02.jpg",
    minPlayers: 4,
    maxPlayers: 8,
    playTimeMinutes: 30,
    weight: 1.1,
    description:
      "Ein Zeichen- und Rate-Kettenspiel, bei dem Begriffe abwechselnd gezeichnet und erraten werden, was am Ende zu witzigen Verfremdungen führt.",
    mechanics: ["Zeichnen", "Party-Spiel", "Kettenreaktion"],
  },
  {
    title: "Doppelkopf",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/21/Doppelkopf.JPG",
    minPlayers: 4,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.8,
    description:
      "Ein klassisches deutsches Stichkartenspiel mit doppeltem Kartensatz, bei dem zwei verdeckte Teams um Stiche und Punkte kämpfen.",
    mechanics: ["Stichspiel", "Teamspiel", "Bluffen"],
  },
  {
    title: "Skat",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/27/Skat_Trick_Jacks.svg",
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 40,
    weight: 3.0,
    description:
      "Deutschlands bekanntestes Kartenspiel für drei Spieler, bei dem Reizen, Trumpfstrategie und Stichspiel über Sieg oder Niederlage entscheiden.",
    mechanics: ["Stichspiel", "Reizen", "Taktik"],
  },
  {
    title: "Elfenland",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/d/d6/Elfenland.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 60,
    weight: 1.9,
    description:
      "Elfen reisen mit unterschiedlichsten Fortbewegungsmitteln durch ein fantasievolles Land und versuchen, möglichst viele Städte zu besuchen.",
    mechanics: ["Routenplanung", "Kartenmanagement", "Reisespiel"],
  },

  // Batch 7
  {
    title: "Diamant",
    imageUrl: null,
    minPlayers: 3,
    maxPlayers: 8,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Diamant (auch Incan Gold) ist ein Push-your-luck-Kartenspiel, bei dem Abenteurer eine Höhle erkunden und entscheiden müssen, wann sie mit ihren Schätzen fliehen, bevor Fallen sie um alles bringen.",
    mechanics: ["Push your luck", "Bluffen", "Kartenmanagement"],
  },
  {
    title: "Colt Express",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c4/Colt_Express_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 40,
    weight: 1.7,
    description:
      "Colt Express ist ein Wildwest-Spiel, bei dem Spieler als Banditen einen fahrenden Zug überfallen und ihre Aktionen durch programmierte Kartenzüge in einer 3D-Zugkulisse planen.",
    mechanics: ["Programmierung", "Aktionsplanung", "Interaktion"],
  },
  {
    title: "Camel Up",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/f/fb/Camel_Up_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 30,
    weight: 1.3,
    description:
      "Bei Camel Up wetten die Spieler auf den Ausgang eines chaotischen Kamelrennens, bei dem die Kamele sich gegenseitig überspringen und stapeln können.",
    mechanics: ["Wettmechanismus", "Würfelglück", "Party-Spiel"],
  },
  {
    title: "Mysterium: Hidden Signs",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 20,
    weight: 1.5,
    description:
      "Mysterium: Hidden Signs ist ein kooperatives Kartenspiel im Mysterium-Universum, bei dem ein stummer Geist den Ermittlern mit Symbolkarten Hinweise gibt, um einen Mordfall zu lösen.",
    mechanics: ["Kooperativ", "Deduktion", "Kartenmanagement"],
  },
  {
    title: "Takenoko",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b6/Deskohran%C3%AD_2012_-_6818.JPG",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 1.5,
    description:
      "In Takenoko kümmern sich die Spieler als kaiserliche Gärtner um einen Panda und züchten Bambus, um Aufträge von Kaiser und Gärtner zu erfüllen.",
    mechanics: ["Legespiel", "Auftragserfüllung", "Ressourcenmanagement"],
  },
  {
    title: "Century: Spice Road",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/e9/Century_Spice_Road_box_art.png",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 40,
    weight: 1.8,
    description:
      "Century: Spice Road ist ein Deckbuilding-Spiel um den Handel mit Gewürzen entlang alter Handelsrouten, bei dem Spieler Karten sammeln und veredeln, um wertvolle Kristalle zu erwerben.",
    mechanics: ["Deckbuilding", "Sammelmechanik", "Handel"],
  },
  {
    title: "Nusfjord",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.0,
    description:
      "Nusfjord ist ein Aufbauspiel von Uwe Rosenberg, in dem die Spieler ein norwegisches Fischerdorf entwickeln, Ressourcen verwalten und Gebäude errichten.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Tableau Building"],
  },
  {
    title: "Grand Austria Hotel",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/26/Playing_board_game_-_Play_965_1720890815192.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.2,
    description:
      "In Grand Austria Hotel führen die Spieler ein Hotel im kaiserlichen Wien, bedienen Gäste mit Würfeln und erfüllen Aufträge, um Ansehen und Punkte zu sammeln.",
    mechanics: ["Worker Placement", "Würfeleinsatz", "Auftragserfüllung"],
  },
  {
    title: "The Castles of Burgundy",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/dd/The_Castles_of_Burgundy_Box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.9,
    description:
      "The Castles of Burgundy ist ein Strategiespiel von Stefan Feld, in dem Spieler mit Würfeln Waren, Gebäude und Landschaftsplättchen erwerben, um ihr Fürstentum in Burgund auszubauen.",
    mechanics: ["Würfeleinsatz", "Legespiel", "Tableau Building"],
  },
  {
    title: "The Quacks of Quedlinburg",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/e3/The_Quacks_of_Quedlinburg_box_cover.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.0,
    description:
      "Bei The Quacks of Quedlinburg brauen die Spieler als Marktschreier Zaubertränke, indem sie blind Zutaten aus einem Beutel ziehen und dabei das Risiko einer explodierenden Kesselmischung abwägen.",
    mechanics: ["Push your luck", "Bag-Building", "Würfelglück"],
  },
  {
    title: "Kingdomino Origins",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 20,
    weight: 1.3,
    description:
      "Kingdomino Origins führt die Dominosteinmechanik der Kingdomino-Reihe in die Steinzeit, ergänzt um Anführerfiguren und Ereigniskarten für mehr taktische Tiefe.",
    mechanics: ["Legespiel", "Domino-Mechanik", "Gebietsausbau"],
  },
  {
    title: "The Voyages of Marco Polo",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d1/Play_1868_1766745157620.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 100,
    weight: 3.3,
    description:
      "The Voyages of Marco Polo schickt die Spieler als Kaufleute entlang der Seidenstraße, wobei Würfel als Ressourcen für Aktionen eingesetzt werden, um Handelsposten und Aufträge zu erfüllen.",
    mechanics: ["Würfeleinsatz", "Routenplanung", "Auftragserfüllung"],
  },
  {
    title: "Orléans",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 80,
    weight: 3.0,
    description:
      "In Orléans rekrutieren die Spieler im mittelalterlichen Frankreich Gefolgsleute als Warensteine in einem Beutel und setzen sie geschickt ein, um Handel, Wissenschaft und Entwicklung voranzutreiben.",
    mechanics: ["Bag-Building", "Routenplanung", "Ressourcenmanagement"],
  },
  {
    title: "Ora et Labora",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 3.7,
    description:
      "Ora et Labora ist ein komplexes Aufbauspiel von Uwe Rosenberg, in dem Spieler eine Klostersiedlung mit Gebäuden, Produktionsketten und Rohstoffveredelung entwickeln.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Tableau Building"],
  },
  {
    title: "Fields of Arle",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 2,
    playTimeMinutes: 100,
    weight: 3.8,
    description:
      "Fields of Arle ist ein Zwei-Personen-Aufbauspiel von Uwe Rosenberg, in dem Spieler über vier Jahreszeiten Felder, Handwerk und Handel in Nordfriesland verwalten.",
    mechanics: ["Worker Placement", "Ressourcenmanagement", "Saisonplanung"],
  },
  {
    title: "At the Gates of Loyang",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.1,
    description:
      "At the Gates of Loyang ist ein Wirtschaftsspiel von Uwe Rosenberg, in dem Spieler als Bauern im alten China Gemüse anbauen und Aufträge von Kunden mit passenden Karten erfüllen.",
    mechanics: [
      "Kartenmanagement",
      "Auftragserfüllung",
      "Ressourcenmanagement",
    ],
  },
  {
    title: "Stone Age",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/50/Stone_Age_game.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.5,
    description:
      "In Stone Age führen die Spieler eine Steinzeitsippe, sammeln Rohstoffe durch Worker Placement und entwickeln ihre Zivilisation durch Werkzeuge und Gebäude.",
    mechanics: ["Worker Placement", "Würfelglück", "Ressourcenmanagement"],
  },
  {
    title: "Alhambra",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d3/Deskohran%C3%AD_08-10-05_048.jpg",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 60,
    weight: 2.1,
    description:
      "Bei Alhambra erwerben die Spieler mit wechselnden Währungen Bauplättchen, um den prächtigsten Palastkomplex im maurischen Spanien zu errichten.",
    mechanics: ["Legespiel", "Ressourcenmanagement", "Tableau Building"],
  },
  {
    title: "Ticket to Ride: Nordic Countries",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 3,
    playTimeMinutes: 60,
    weight: 1.9,
    description:
      "Ticket to Ride: Nordic Countries ist eine eigenständige Variante des Klassikers, bei der Spieler in Skandinavien Zugstrecken sammeln und Zielkarten mit langen Bahnrouten erfüllen.",
    mechanics: ["Routenplanung", "Kartensammeln", "Gebietskontrolle"],
  },
  {
    title: "Ticket to Ride: Germany",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 1.9,
    description:
      "Ticket to Ride: Germany überträgt das beliebte Streckenbauspiel auf die deutsche Eisenbahnlandschaft, ergänzt um Fährverbindungen und neue Zielkarten.",
    mechanics: ["Routenplanung", "Kartensammeln", "Streckenbau"],
  },
  {
    title: "Carcassonne: Inns & Cathedrals",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 45,
    weight: 1.9,
    description:
      "Carcassonne: Inns & Cathedrals ist die erste große Erweiterung zum Legespiel-Klassiker und fügt große Kathedralen, Wirtshäuser sowie den Bauern-Wächter als neue taktische Elemente hinzu.",
    mechanics: ["Legespiel", "Gebietskontrolle", "Mehrheitenwertung"],
  },
  {
    title: "Robinson Crusoe: Adventures on the Cursed Island",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/26/Pyrkon_2017_Robinson_Crusoe_Board_Game_4280061.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.6,
    description:
      "Robinson Crusoe ist ein kooperatives Überlebensspiel, in dem Schiffbrüchige auf einer einsamen Insel Nahrung, Unterkunft und Werkzeuge organisieren müssen, um kritische Ereignisse zu überstehen.",
    mechanics: ["Kooperativ", "Worker Placement", "Ereigniskarten"],
  },
  {
    title: "Mage Knight Board Game",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/1/19/Mage_Knight_Board_Game_Box_Art_2011.png",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 4.1,
    description:
      "Mage Knight ist ein komplexes Deckbuilding-Abenteuerspiel, in dem mächtige Helden eine Fantasiewelt erkunden, Monster bekämpfen und Städte erobern.",
    mechanics: ["Deckbuilding", "Kartenmanagement", "Erkundung"],
  },
  {
    title: "The 7th Continent",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.9,
    description:
      "The 7th Continent ist ein kooperatives Erkundungs- und Abenteuerspiel, bei dem die Spieler auf einer geheimnisvollen Insel einen Fluch mithilfe eines riesigen Karten- und Ereignissystems zu brechen versuchen.",
    mechanics: ["Kooperativ", "Erkundung", "Kartenmanagement"],
  },
  {
    title: "Tainted Grail: The Fall of Avalon",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/d/d5/Tainted_Grail_The_Fall_of_Avalon_Cover_1.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.7,
    description:
      "Tainted Grail: The Fall of Avalon ist ein kooperatives Rollenspiel-Brettspiel in einer düsteren arthurianischen Fantasiewelt mit offener Erkundung, Charakterentwicklung und einer verzweigten Kampagne.",
    mechanics: ["Kooperativ", "Erkundung", "Charakterentwicklung"],
  },

  // Batch 8 (unique entries only — expansions/base-game duplicates of batch 1 dropped)
  {
    title: "Sword & Sorcery",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 90,
    weight: 3.4,
    description:
      "Ein kooperatives Dungeon-Crawler-Spiel mit Miniaturen, in dem Helden gegen Orks und Untote kämpfen und sich über eine Kampagne hinweg weiterentwickeln.",
    mechanics: ["Kooperativ", "Miniaturen", "Kampagnenspiel", "Würfelglück"],
  },
  {
    title: "Too Many Bones",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/07/Too_Many_Bones_-_IMG_20240127_182430.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 3.75,
    description:
      "Ein kooperatives Kampagnenspiel, in dem einzigartige 'Gearlocs' durch Würfel-Deckbuilding gegen wachsende Bedrohungen bestehen müssen.",
    mechanics: ["Kooperativ", "Deckbuilding", "Würfelglück", "Kampagnenspiel"],
  },
  {
    title: "Gloomhaven: Jaws of the Lion",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/ee/Gloomhaven_Cover_Art.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.83,
    description:
      "Ein eigenständiger Einstieg in die Gloomhaven-Welt, bei dem vier neue Helden gemeinsam eine actionreiche Kampagne mit taktischen Kämpfen erleben.",
    mechanics: ["Kooperativ", "Kartenmanagement", "Kampagnenspiel", "Legacy"],
  },
  {
    title: "Frosthaven",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/e/ee/Gloomhaven_Cover_Art.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 3.98,
    description:
      "Der Nachfolger von Gloomhaven, in dem eine Gruppe von Söldnern eine abgelegene Bergfeste gegen Monster und die eisige Umgebung verteidigt und ausbaut.",
    mechanics: [
      "Kooperativ",
      "Kampagnenspiel",
      "Ressourcenmanagement",
      "Kartenmanagement",
    ],
  },
  {
    title: "Wingspan: Asia",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 60,
    weight: 2.4,
    description:
      "Eine Erweiterung zu Wingspan mit asiatischen Vogelarten, die neue Kraftkarten und ein modulares Ass der Asse-Tableau einführt.",
    mechanics: [
      "Kartenmanagement",
      "Engine Building",
      "Würfelglück",
      "Set Collection",
    ],
  },
  {
    title: "Terraforming Mars: Ares Expedition",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 60,
    weight: 2.6,
    description:
      "Eine schnellere, kartenbasierte Variante von Terraforming Mars, bei der Konzerne gemeinsam den Mars besiedelbar machen, ohne Spielertableaus.",
    mechanics: [
      "Kartenmanagement",
      "Engine Building",
      "Tableau Building",
      "Drafting",
    ],
  },
  {
    title: "Point Salad",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 20,
    weight: 1.15,
    description:
      "Ein leichtes Kartenspiel, bei dem Gemüsekarten gesammelt werden, deren Punktwert von der gewählten Kartenseite und der eigenen Sammlung abhängt.",
    mechanics: ["Kartenmanagement", "Set Collection", "Drafting"],
  },
  {
    title: "Ticket to Ride: Rails & Sails",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/39/Ticket_to_Ride_Rails_%26_Sails.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 90,
    weight: 2.31,
    description:
      "Eine Weiterentwicklung von Ticket to Ride mit Zügen und Schiffen, bei der Spieler Kontinente über Schienen- und Seewege verbinden.",
    mechanics: ["Routenbau", "Set Collection", "Gebietskontrolle"],
  },
  {
    title: "Long Shot: The Dice Game",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 8,
    playTimeMinutes: 25,
    weight: 1.3,
    description:
      "Ein Würfelspiel rund um ein Pferderennen, bei dem Spieler auf Pferde wetten und deren Fortschritt durch Würfelwürfe beeinflussen.",
    mechanics: ["Würfelglück", "Wetten", "Bluffen"],
  },
  {
    title: "Circle the Wagons",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 6,
    playTimeMinutes: 20,
    weight: 1.5,
    description:
      "Ein Kartenlegespiel, bei dem Spieler Planwagen so anordnen, dass möglichst viele Punkte durch geschickte Reihenbildung entstehen.",
    mechanics: ["Kartenmanagement", "Legespiel", "Set Collection"],
  },
  {
    title: "Sea Salt & Paper",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 20,
    weight: 1.2,
    description:
      "Ein maritimes Kartenspiel, bei dem Spieler Kombinationen aus Karten sammeln und dabei abwägen, wann sie riskieren, die Runde zu beenden.",
    mechanics: ["Kartenmanagement", "Set Collection", "Bluffen"],
  },
  {
    title: "Sky Team",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/SkyTeamLogo.png",
    minPlayers: 2,
    maxPlayers: 2,
    playTimeMinutes: 20,
    weight: 1.86,
    description:
      "Ein kooperatives Zwei-Personen-Spiel, bei dem Pilot und Co-Pilot ohne Kommunikation ein Flugzeug gemeinsam sicher landen müssen.",
    mechanics: ["Kooperativ", "Würfelmanagement", "Zwei-Spieler-Spiel"],
  },
  {
    title: "Ark Nova",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/4/42/Ark_Nova_box_cover.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 150,
    weight: 3.71,
    description:
      "Ein komplexes Aufbauspiel, in dem Spieler einen modernen Zoo mit Fokus auf Artenschutz und Forschung planen und erweitern.",
    mechanics: [
      "Tableau Building",
      "Kartenmanagement",
      "Engine Building",
      "Gebietsgestaltung",
    ],
  },
  {
    title: "Res Arcana",
    imageUrl: null,
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.8,
    description:
      "Ein Kartenspiel um magische Artefakte und Orte, bei dem Spieler Ressourcen sammeln, um mächtige Monumente zu errichten.",
    mechanics: ["Kartenmanagement", "Ressourcenmanagement", "Engine Building"],
  },
  {
    title: "Lost Ruins of Arnak",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/0/0c/Lost_Ruins_of_Arnak_box_cover.jpg",
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.93,
    description:
      "Eine Kombination aus Deckbuilding und Worker Placement, bei der Forscher eine geheimnisvolle Insel erkunden und antike Ruinen erforschen.",
    mechanics: ["Deckbuilding", "Worker Placement", "Ressourcenmanagement"],
  },

  // Batch 9 (unique entries only — Root: The Underworld Expansion duplicate of batch 5 dropped)
  {
    title: "Wingspan: European Expansion",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/c/c3/3d-wingspan-768x752.png",
    minPlayers: 1,
    maxPlayers: 5,
    playTimeMinutes: 70,
    weight: 2.4,
    description:
      "Die Erweiterung bringt 81 neue europäische Vogelarten sowie neue Ziel- und Bonuskarten in Wingspan, das ornithologisch inspirierte Engine-Building-Spiel von Elizabeth Hargrave.",
    mechanics: ["Engine Building", "Kartenmanagement", "Set Collection"],
  },
  {
    title: "Everdell: Pearlbrook",
    imageUrl: null,
    minPlayers: 1,
    maxPlayers: 4,
    playTimeMinutes: 80,
    weight: 2.8,
    description:
      "Pearlbrook erweitert das Tier-Aufbauspiel Everdell um einen neuen Fluss, Boote und die Otter-Fraktion und bringt zusätzliche strategische Tiefe in den Aufbau der Waldstadt.",
    mechanics: ["Worker Placement", "Kartenmanagement", "Tableau Building"],
  },
  {
    title: "Catan: Traders and Barbarians",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 120,
    weight: 2.6,
    description:
      "Die dritte große Erweiterung zu Catan bündelt mehrere Szenarien und Regelvarianten, unter anderem Handelsrouten, Barbaren-Angriffe und ein Würfelspiel-Modul.",
    mechanics: ["Handel", "Würfelglück", "Gebietsausbau"],
  },
  {
    title: "Carcassonne: The River",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/5/5e/Carcassonne-game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 35,
    weight: 1.5,
    description:
      "Die kleine Erweiterung fügt dem Legespiel Carcassonne einen Fluss mit Quelle und Mündung hinzu, der die Startaufstellung der Landschaftsplättchen strukturiert.",
    mechanics: ["Legespiel", "Gebietskontrolle"],
  },
  {
    title: "Dixit: Journey",
    imageUrl: "https://upload.wikimedia.org/wikipedia/en/7/7b/Dixitgame.jpg",
    minPlayers: 3,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.2,
    description:
      "Journey ist die zweite Erweiterung zu Dixit mit 84 neuen, surrealen Bildkarten, die das beliebte Rate- und Assoziationsspiel um Motive erweitern.",
    mechanics: ["Bluffen", "Assoziation", "Kartenspiel"],
  },
  {
    title: "Ticket to Ride: Switzerland",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/9/92/Ticket_to_Ride_Board_Game_Box_EN.jpg",
    minPlayers: 2,
    maxPlayers: 3,
    playTimeMinutes: 60,
    weight: 2.0,
    description:
      "Diese Landkarten-Erweiterung für zwei bis drei Spieler führt durch die Schweiz und verlangt aufgrund der kompakten Streckenführung besonders präzise Streckenplanung.",
    mechanics: ["Routenbau", "Set Collection"],
  },
  {
    title: "King of Tokyo: Power Up!",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2c/Deskohran%C3%AD_2012_-_6869.JPG",
    minPlayers: 2,
    maxPlayers: 6,
    playTimeMinutes: 30,
    weight: 1.6,
    description:
      "Power Up! erweitert das Monster-Duell King of Tokyo um Evolutionskarten, mit denen die Monster dauerhafte Sonderfähigkeiten erwerben können.",
    mechanics: ["Würfelglück", "Kartenmanagement", "Take That"],
  },
  {
    title: "Pandemic: Fall of Rome",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/3/36/Pandemic_game.jpg",
    minPlayers: 2,
    maxPlayers: 5,
    playTimeMinutes: 45,
    weight: 2.5,
    description:
      "In dieser eigenständigen Variante des kooperativen Pandemic-Systems verteidigen die Spieler das Römische Reich gegen einfallende Barbarenstämme statt gegen Krankheiten.",
    mechanics: ["Kooperativ", "Gebietskontrolle", "Hand-Management"],
  },
  {
    title: "Azul: Queen's Garden",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/2/23/Picture_of_Azul_game_box.jpg",
    minPlayers: 2,
    maxPlayers: 4,
    playTimeMinutes: 45,
    weight: 2.3,
    description:
      "In dieser eigenständigen Azul-Variante gestalten die Spieler einen königlichen Garten aus Fliesen und verfolgen dabei mehrere parallele Punktepfade statt einer klassischen Wand.",
    mechanics: ["Legespiel", "Set Collection", "Musterbildung"],
  },

  // Round out to 200: a second club copy of the all-time classic, as real clubs often own duplicates.
  {
    title: "Catan",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/en/a/a3/Catan-2015-boxart.jpg",
    minPlayers: 3,
    maxPlayers: 4,
    playTimeMinutes: 90,
    weight: 2.3,
    description:
      "Zweites Vereinsexemplar: Die Spieler siedeln auf der Insel Catan, sammeln Rohstoffe und bauen Straßen, Siedlungen und Städte, um als Erste 10 Siegpunkte zu erreichen.",
    mechanics: [
      "Handel",
      "Würfelglück",
      "Gebietsausbau",
      "Ressourcenmanagement",
    ],
  },
];
