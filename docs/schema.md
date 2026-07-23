# 📊 Systemarchitektur & Datenmodelle

Dieses Dokument beschreibt die aufgeteilte Datenbankarchitektur für die Plattform der *Oecher Meeples Ludothek*. Das gesamte Datenmodell ist in drei funktionale Module unterteilt, um eine klare Strukturierung der API-Endpunkte und eine einfache Erweiterbarkeit während der Entwicklung zu garantieren.

---

## 1. Öffentlicher Bereich (Public Area)

### Beschreibung

Das Datenmodell für den öffentlichen Bereich bildet die Grundlage für alle Interaktionen von nicht-angemeldeten Besuchern der Webseite. Dieses Modul steuert die allgemeinen redaktionellen Inhalte und die Außendarstellung des Vereins.

Es verwaltet die Basis-Metadaten von Benutzern, die als Autoren für Blogeinträge fungieren, die eigentlichen Blogposts (inklusive Verknüpfungen zu externen Plattformen wie Instagram) sowie die offiziellen Vereinstermine, welche über Schnittstellen wie die Google Calendar API synchronisiert werden können.

### Diagramm

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email
        String roleId FK
    }

    BlogPost {
        String id PK
        String title
        Text content
        DateTime publishedAt
        String authorId FK
        String instagramPostUrl
    }

    Event {
        String id PK
        String googleCalendarEventId
        String title
        Text description
        DateTime startTime
        DateTime endTime
        String location
        Boolean isPublic
    }

    User ||--o{ BlogPost : "writes"

```

---

## 2. Mitgliederbereich (Members Area)

### Beschreibung

Der Mitgliederbereich umfasst alle Datenstrukturen, die nur für authentifizierte Vereinsmitglieder nach einem Login zugänglich sind. Dieser Abschnitt steuert die sichere Profilverwaltung, vereinsinterne Finanzdaten (z. B. für Mitgliedsbeiträge) sowie die Anbindung an externe Brettspiel-Datenbanken (BoardGameGeek und BoardGameArena).

Zusätzlich ist hier das komplette Verleihsystem der Ludothek verankert. Es verknüpft den globalen Spielekatalog mit den physisch im Verein vorhandenen Exemplaren (`GameCopy`), protokolliert die Ausleihvorgänge, verwaltet das Wissen der Spieleerklärer (`GameExplanation`) und steuert die integrierte Spielersuche (`LFGPost`).

### Diagramm

```mermaid
erDiagram
    Enum_CopyStatus {
        AVAILABLE status
        BORROWED status
        MAINTENANCE status
        DEINVENTARISED status
    }

    User {
        String id PK
        String name
        String email
        String bankDetails
        String bggUsername
        String bgaUsername
    }

    Meeple {
        String id PK
        String userId FK 
        String memberNumber 
        String bankDetails 
        DateTime joinedAt
        DateTime leftAt
    }

    BoardGame {
        String id PK
        Int bggId
        String title
        Int minPlayers
        Int maxPlayers
        Int playTime
        Float weight
        String imageUrl
    }

    GameCopy {
        String id PK
        String gameId FK
        String barcode
        String statusId FK
        String state
        String currentLocation
    }

    GameExplanation {
        String userId PK "FK"
        String gameId PK "FK"
        Int experienceLevel
    }

    BorrowReceipt {
        String id PK
        String copyId FK
        String userId FK
        DateTime borrowedAt
        DateTime dueDate
        DateTime returnedAt
    }

    LFGPost {
        String id PK
        String creatorId FK
        String gameId FK
        String title
        Text description
        DateTime plannedAt
        Int maxParticipants
    }

    LFGMember {
        String postId PK "FK"
        String userId PK "FK"
    }

    Invitation {
        String id PK
        String meepleId FK   "Für welches Mitglied ist diese Einladung?"
        String email         "Wohin ging die Einladung"
        String token         "Einzigartiger Registrierungs-Hash"
        DateTime expiresAt   "Gültigkeitsdauer der Einladung"
        Boolean isUsed
    }


%% --- OBERE PERIPHERIE (Spiele & Exemplare) ---
    GameCopy }o--|| BoardGame : "is_copy_of"
    GameCopy ||--o| Enum_CopyStatus : "has_status"

    %% --- AUSLEIHSYSTEM (Fließt nach unten auf User zu) ---
    BorrowReceipt }o--|| GameCopy : "borrows"
    BorrowReceipt }o--|| Meeple : "borrowed_by"
    
    %% --- ERKLÄRER (Fließt diagonal auf User zu) ---
    GameExplanation }o--|| BoardGame : "refers_to"
    GameExplanation }o--|| Meeple : "explained_by"
    
    %% --- SPIELERSUCHE (Umlagert User von unten) ---
    LFGPost }o--o| BoardGame : "plays_game"
    LFGPost }o--|| Meeple : "created_by"
    User |o--|| Meeple : "belongs_to"
    LFGMember }o--|| LFGPost : "belongs_to_group"
    LFGMember }o--|| Meeple : "is_player"

    Invitation }o--|| Meeple : "invites_for"

```

---

## 3. Events & Vor-Ort-Betrieb (Events & Operations)

### Beschreibung

Dieses Teilschema koordiniert die Logistik vor Ort während der Spieletreffs und steuert den schulinternen Sekundärmarkt des Vereins. Es konzentriert sich auf den physischen Betrieb bei Veranstaltungen.

Hierzu gehört die Personal- und Helferplanung über ein Schichtsystem, bei dem den Mitgliedern spezifische Aufgabenbereiche (Kasse, Theke, Spieleausleihe) über vordefinierte Rollen (`Enum_ShiftRole`) zugewiesen werden. Gleichzeitig wird hierüber der "Bring & Buy Flohmarkt" abgebildet, um den Zustand, die Besitzverhältnisse und die Preise der zum Verkauf stehenden Spiele lückenlos zu überwachen.

### Diagramm

```mermaid
erDiagram
    Enum_ShiftRole {
        THEKE role
        KASSE role
        LEIHE role
        ERKLAERBAER role
    }

    Enum_FleaMarketStatus {
        FOR_SALE status
        SOLD status
        RESERVED status
    }

    User {
        String id PK
        String name
        String email
    }

    Event {
        String id PK
        String title
        DateTime startTime
        DateTime endTime
        String location
    }

    Shift {
        String id PK
        String eventId FK
        String userId FK
        String shiftRoleId FK
        DateTime startTime
        DateTime endTime
    }

    FleaMarketItem {
        String id PK
        String sellerId FK
        String title
        String itemCondition
        Decimal price
        String statusId FK
        Boolean isBringAndBuy
    }

    Shift }o--|| Event : "belongs_to"
    Shift }o--o| User : "assigned_to"
    Shift ||--o| Enum_ShiftRole : "requires_role"
    
    FleaMarketItem }o--|| User : "offered_by"
    FleaMarketItem ||--o| Enum_FleaMarketStatus : "has_status"

```