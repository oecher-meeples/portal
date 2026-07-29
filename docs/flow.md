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
        Meeple[("Meeple<br/>= Login-Konto")]
        Unit[(Aufbewahrungseinheit)]
        Holding[(Aufenthalt)]
    end

    subgraph UI["Interfaces"]
        PublicSite[Öffentliche Webseite]
        MemberArea[Mitgliederbereich]
        AdminArea[Admin-Bereich]
    end

    GCal -->|Termine-Sync| Event
    BGGAPI -->|Spieldaten| BoardGame
    EmailSvc -->|Einladungslink| Invite[(Invite-Token)]
    GoogleOAuth -->|SSO-Token| Meeple
    Invite -->|eingelöst beim ersten Login| Meeple
    BlogPost -.->|Cross-Post| MetaAPI

    BoardGame --> Holding
    Holding -->|Ziel: Einheit| Unit
    Holding -->|Ziel: Person| Meeple
    Unit -->|Verwahrer| Meeple

    Event --> PublicSite
    BlogPost --> PublicSite
    Meeple --> MemberArea
    Meeple --> AdminArea
    BoardGame --> MemberArea
```

> Ein `Meeple` ist dasselbe Objekt wie das Login-Konto, kein zweiter Personendatensatz — siehe [ADR 0002](adr/0002-meeple-eins-zu-eins-zum-login.md).

---

## 2. Onboarding & Mitgliedschafts-Lebenszyklus

Vor der Registrierung existiert **kein** Meeple — der Einladungslink ist ein reines Token ohne Personenbezug, der Meeple entsteht beim ersten Login.

```mermaid
flowchart LR
    A([Admin]) -->|erzeugt Token| I[(Invite)]
    I -->|Link weitergeben| Link[Einladungslink]

    Link --> Choice{Registrierungsweg}
    Choice -->|Klassisch| TV{Token gültig?}
    Choice -->|Google SSO – zurückgestellt| EV{E-Mail-Match?}

    TV -->|nein| Deny1[Zugang verweigert]
    TV -->|ja| Create[Login-Konto erstellen]
    EV -->|nein| Deny2[Zugang verweigert]
    EV -->|ja| Create

    Create -->|erster Login| M[("Meeple<br/>aktiv")]
    I -->|redeemedAt setzen| I

    A -->|widerrufen| Revoke[Token invalidiert]

    M -->|Kündigung vermerken| K[("Meeple<br/>gekündigt")]
    K -->|Jahreswechsel erreicht| Aus[("Meeple<br/>ausgetreten")]
    K -->|Kündigung widerrufen| M
    Aus -->|keine Vereinsspiele mehr bei ihm| Anon[Anonymisierung]
    Anon -->|Konto und Kontaktdaten gelöscht| Rest[("Meeple<br/>anonymisiert")]
    Rest -.->|Aufenthalte und Gesuche bleiben lesbar| Rest
```

> Die Zustände `aktiv` / `gekündigt` / `ausgetreten` / `anonymisiert` werden aus `resignedAt`, `membershipEndsAt` und `anonymizedAt` **abgeleitet**, nicht gespeichert.

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

## 4. Spielekatalog, Aufbewahrung & Deinventarisierung

Ein Datensatz pro physischem Spiel — keine getrennte Exemplar-Ebene. Etiketten hängen an den **Aufbewahrungseinheiten**, nicht an den Spielen; die EAN kennzeichnet das Produkt und ist deshalb nicht eindeutig. Begründung: [ADR 0001](adr/0001-ludothek-aufenthalte-statt-exemplare.md).

```mermaid
flowchart LR
    BGGAPI([BGG API]) -->|Spieldaten| BG[(BoardGame)]
    A([Admin]) -->|manuell anlegen| BG
    A -->|EAN pflegen| BG

    A -->|Einheit anlegen| SU[("Aufbewahrungseinheit<br/>Karton / Regal")]
    SU -->|Etikett drucken| QR["QR-Etikett<br/>Inhalt = reiner Code"]
    SU -->|steht in| SU
    SU -->|Verwahrer| M([Meeple])
    SU -->|Ortsangabe Freitext| Ort[z. B. Keller links]

    BG -->|genau ein offener| H[(Aufenthalt)]
    H -->|Ziel: Einheit| SU
    H -->|Ziel: Person| M

    H --> Z{Zustand abgeleitet}
    Z --> Z_FR[frei]
    Z --> Z_AU[ausgeliehen]
    Z --> Z_WA[Wartung]
    Z --> Z_NE["nicht erfasst<br/>liegt in Unsortiert"]

    Pruef[Vollständigkeitsprüfung] -->|bestanden| BG
    Pruef -->|Mangel gemeldet| Z_WA

    BG -->|Grund + Datum| DI[deinventarisiert]
    DI -.->|Aufenthalt bleibt offen, Standort unverändert| H
```

---

## 5. Aufenthalte: Ausleihe, Rückgabe, Weitergabe, Umlagern

Alle vier Vorgänge sind derselbe Schreibvorgang — den offenen Aufenthalt schließen, den nächsten öffnen. Es gibt **keine Leihfrist**.

```mermaid
flowchart LR
    Scan["QR-/EAN-Scan<br/>Einheiten-Code oder EAN"] --> Res{Auflösung}
    Res -->|EAN, n Treffer| Wahl[Spiel auswählen]
    Res -->|Einheiten-Code| SU[(Aufbewahrungseinheit)]
    Res -->|unbekannt| NF["nicht im Bestand<br/>+ Anlage-Link bei games:manage"]
    Wahl --> BG[(BoardGame)]

    BG --> Vor{Vorgänger-Aufenthalt}
    Vor -->|aus Einheit| Aus["Ausleihe<br/>origin LOAN"]
    Vor -->|von Person| Weiter["Weitergabe<br/>origin HANDOVER"]
    Aus --> NeuP["neuer Aufenthalt<br/>Ziel: Meeple"]
    Weiter --> NeuP

    NeuP -->|Rückgabe in Einheit| Rueck["Aufenthalt<br/>origin RETURN, Ziel: Einheit"]
    NeuP -->|Rückgabe an Person| RueckP["Aufenthalt<br/>origin RETURN, Ziel: Meeple<br/>keine Ausleihe"]
    RueckP -->|einlagern| Rueck

    SU -->|Spiel einlagern / Standort korrigieren| Umlag["Aufenthalt<br/>origin RELOCATION, Ziel: Einheit"]
    SU -->|Einheit umlagern| Move[(StorageUnitMove)]

    NeuP --> Best{"Wer hat gebucht?"}
    Best -->|Empfänger selbst| OK["confirmedAt gesetzt"]
    Best -->|abgebende Person| Unbest["unbestätigt<br/>Weitergabe: per Klick bestätigen<br/>Rückgabe: durch Einlagern bestätigen"]

    Pruef[Prüfbogen] -->|condition + lastCheckedAt| BG
```

---

## 6. Spielergesuche

```mermaid
flowchart LR
    M([Mitglied]) -->|inseriert| Post[(LfgPost)]
    Post --> Titel["Spieltitel als Freitext<br/>keine Relation auf BoardGame"]
    Post --> Meta[Datum + max. Teilnehmer]
    Post -->|Ersteller ist erste:r Teilnehmer:in| LFGMem[(LfgParticipant)]

    Other([Mitspieler]) -->|meldet sich an| LFGMem
    LFGMem --> Post

    Post --> Full{abgeleitet}
    Full -->|Plätze frei und Termin in der Zukunft| Open[Gesuch offen]
    Full -->|Limit erreicht| Voll[Gesuch voll]
    Full -->|Termin vergangen| Abg[abgelaufen]
    Post -->|closedAt gesetzt| Closed[Gesuch geschlossen]
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
