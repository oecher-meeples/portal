# Datenfluss-Diagramme

Zentrale Datenflüsse des Oecher Meeples Vereinsportals, gegliedert nach funktionalen Bereichen.

---

## 1. Systemübersicht

```mermaid
flowchart LR
    subgraph EXT["Externe Services"]
        GCal([Google Calendar])
        BGGAPI([BoardGameGeek API])
        MetaAPI([Meta Graph API])
        EmailSvc([E-Mail Service])
        GoogleOAuth([Google OAuth])
    end

    subgraph CORE["Kern-Datenbank"]
        Event[(Event)]
        BlogPost[(BlogPost)]
        BoardGame[(BoardGame)]
        UserMeeple[(User / Meeple)]
    end

    subgraph UI["Interfaces"]
        PublicSite[Öffentliche Webseite]
        MemberArea[Mitgliederbereich]
        AdminArea[Admin-Bereich]
    end

    GCal -->|Termine-Sync| Event
    BGGAPI -->|Spieldaten| BoardGame
    EmailSvc -->|Einladungslink| UserMeeple
    GoogleOAuth -->|SSO-Token| UserMeeple
    BlogPost -.->|Cross-Post| MetaAPI

    Event --> PublicSite
    BlogPost --> PublicSite
    UserMeeple --> MemberArea
    UserMeeple --> AdminArea
    BoardGame --> MemberArea
```

---

## 2. Onboarding & Authentifizierung

```mermaid
flowchart LR
    A([Admin]) -->|erstellt| M[(Meeple)]
    M -->|generiert Token| I[(Invitation)]
    I -->|sendet| Email[E-Mail-Link]

    Email --> Choice{Registrierungsweg}
    Choice -->|Klassisch| TV{Token gültig?}
    Choice -->|Google SSO| EV{E-Mail-Match?}

    TV -->|nein| Deny1[Zugang verweigert]
    TV -->|ja| Create[User erstellen]
    EV -->|nein| Deny2[Zugang verweigert]
    EV -->|ja| Create

    Create --> U[(User)]
    U -->|verknüpft mit| M
    I -->|isUsed = true| I

    A -->|widerrufen| Revoke[Token invalidiert]

    U -->|DSGVO-Selbstlöschung| Anon[Daten anonymisiert]
    Anon -.->|Verlinkungen erhalten| U
```

---

## 3. Blog-Erstellung & Instagram Cross-Posting

```mermaid
flowchart LR
    Mod([Moderator]) -->|verfasst| Draft[Entwurf]
    GCal([Google Calendar]) -->|Sync| E[(Event)]

    Draft -->|veröffentlicht| BP[(BlogPost)]
    E --> Site[Öffentliche Webseite]
    BP --> Site

    BP --> IGCheck{Instagram teilen?}
    IGCheck -->|nein| Site
    IGCheck -->|ja| Queue[Hintergrund-Queue]

    Queue -->|async Job| Meta([Meta Graph API])
    Meta --> Result{Erfolgreich?}
    Result -->|ja| URL[instagramPostUrl]
    Result -->|Retry möglich| Queue
    Result -->|max. Versuche| ErrStatus[Fehlerstatus]
    URL --> BP
```

---

## 4. Spielekatalog & Deinventarisierung

```mermaid
flowchart LR
    BGGAPI([BGG API]) -->|Spieldaten| BG[(BoardGame)]
    A([Admin]) -->|manuell anlegen| BG

    BG -->|Exemplar hinzufügen| GC[(GameCopy)]
    GC -->|Label generieren| QR[QR-Etikett]

    GC --> S_AV[AVAILABLE]
    S_AV -->|Ausleihe| S_BO[BORROWED]
    S_BO -->|Rückgabe| S_AV
    S_AV -->|Schaden| S_MA[MAINTENANCE]
    S_MA -->|Repariert| S_AV

    M1([Meeple A]) -->|Tausch initiieren| Trade[(Trade)]
    Trade -->|neuer Besitzer| M2([Meeple B])
    GC -->|Eigentümer wechselt| Trade

    S_AV -->|Grund angeben| S_DI[DEINVENTARISED]
    S_MA -->|Totalschaden| S_DI
    S_DI -.->|Verknüpfung bleibt erhalten| BR[(BorrowReceipt)]
```

---

## 5. Ausleihvorgang

```mermaid
flowchart LR
    Scan[QR / EAN-Scan] --> GC[(GameCopy)]
    GC --> Check{AVAILABLE?}
    Check -->|nein| Info[Status anzeigen]
    Check -->|ja| BR[(BorrowReceipt)]

    BR --> Fields[borrowedAt + dueDate]
    BR -->|setzt| S_BO[BORROWED]

    ReturnScan[Rückgabe-Scan] --> BR
    BR -->|returnedAt setzen| Closed[Abgeschlossen]
    Closed -->|setzt| S_AV[AVAILABLE]

    Prüfbogen[Inventur-Prüfbogen] -->|state aktualisieren| GC
```

---

## 6. Spielergesuche

```mermaid
flowchart LR
    M([Mitglied]) -->|inseriert| Post[(LFGPost)]
    Post --> BG[(BoardGame)]
    Post --> Meta[Datum + max. Teilnehmer]

    Other([Mitspieler]) -->|meldet sich an| LFGMem[(LFGMember)]
    LFGMem --> Post

    Post --> Full{Limit erreicht?}
    Full -->|nein| Open[Gesuch offen]
    Full -->|ja| Closed[Gesuch geschlossen]
```

---

## 7. Event-Betrieb & Helferplan

```mermaid
flowchart LR
    A([Admin]) -->|anlegen| E[(Event)]
    E -->|Schichten definieren| S[(Shift)]
    S --> Role[Theke / Kasse / Leihe / Erklärbär]

    M([Mitglied]) -->|einschreiben| S
    S --> Confirm{Zusage-Status}
    Confirm -->|sicher| Safe[Bestätigt]
    Confirm -->|unsicher| Tentative[Vorläufig]

    M -->|registrieren als| GE[(GameExplanation)]
    GE --> BG[(BoardGame)]
    GE --> Level[Erfahrungsstufe]

    Guest([Event-Gast]) -->|QR-Code scannen| BG
    BG --> Info[Spielinfos + Erklärbären-Liste]
    BG -.->|YouTube-Link| Video[Erklärvideo]
```

---

## 8. Bring & Buy Flohmarkt

```mermaid
flowchart LR
    M([Mitglied]) -->|anlegen| FMI[(FleaMarketItem)]
    Excel[Excel-Import] -->|Bulk-Upload| FMI

    FMI --> Details[Titel + Zustand + Preis]
    FMI --> S_FS[FOR_SALE]

    S_FS --> View[Kassenansicht]

    Cashier([Kasse]) -->|reservieren| S_RE[RESERVED]
    Cashier -->|Verkauf bestätigen| S_SO[SOLD]
    S_RE --> S_FS
    S_RE --> S_SO
    S_SO -.->|Verkaufshistorie erhalten| FMI
```
