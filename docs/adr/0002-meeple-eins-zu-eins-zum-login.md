---
status: accepted
---

# Meeple ist 1:1 das Login-Konto

Ein `Meeple` entsteht beim ersten Login und existiert nicht ohne Konto — es gibt **keinen Mitgliedsdatensatz vor der Registrierung**. Grund: der Einladungs-Flow aus Phase 2 kennt bereits kein Personenmodell ([`prisma/schema.prisma`](../../prisma/schema.prisma), Modell `Invite` ist ein Token mit Ablaufdatum ohne Personenbezug), und ein Mitgliedsdatensatz ohne Konto würde ein zweites Personenmodell samt Verknüpfungs- und Zusammenführungslogik erfordern, das ausschließlich der Mitgliederverwaltung dient.

## Considered Options

- **Mitgliedschaft unabhängig vom Konto** (Admin legt Mitglieder an, die Einladung verknüpft später das Konto): erlaubt Vereinsmitglieder ohne Portal-Nutzung und damit auch Kartons bei solchen Personen. Verworfen wegen des zweiten Personenmodells und der Verknüpfungslogik — der Verein ist klein genug, dass Portal-Nutzung für Verwahrer voraussetzbar ist.
- **Mitgliedschaft und Portal-Profil als zwei getrennte Modelle** (für Portal-Nutzer, die keine Mitglieder sind, z. B. externe Moderatoren): saubere Trennung, aber zwei Wege, auf eine Person zu zeigen — und damit doppelte Abfragen an jeder Stelle, die „wer hat das Spiel" beantwortet.

## Consequences

- Kartons, Regale, Ausleihen und Gesuche können nur auf **registrierte** Personen zeigen. Ein Vereinsmitglied ohne Portal-Account ist nicht abbildbar — ein Karton bei so einer Person ebenfalls nicht.
- Die Admin-Mitgliederverwaltung zeigt nur registrierte Mitglieder; „Mitglied anlegen" bleibt der Einladungs-Flow.
- Eine Ausnahme durchbricht die 1:1-Regel bewusst: bei der Anonymisierung wird das Konto gelöscht, der `Meeple` bleibt als namenloser Rest bestehen, damit Aufenthalte und Gesuche weiter lesbar sind. `neonAuthUserId` ist deshalb nullable — das ist kein vergessenes `required`.
- Sollten Mitglieder ohne Account später doch nötig werden, ist das eine Migration mit Datenpflege, kein Schema-Detail.
