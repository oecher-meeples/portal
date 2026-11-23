import { useState } from "react";

/**
 * `inputValue`-State für einen "controlled" `Combobox` (Live-Review F14) —
 * ohne diesen Hook zeigte das Eingabefeld nach einem Deep-Link (`value` schon
 * beim ersten Render gesetzt) zunächst weiterhin den Placeholder, weil
 * `useState("")` den Anzeigenamen ignorierte und Base UI bei einem
 * explizit kontrollierten `inputValue` keine eigene Sync übernimmt — erst ein
 * Klick ins Feld löste intern eine Aktualisierung aus. Vorbelegung aus
 * `selectedName` behebt den ersten Render; das "Zustand während des Renders
 * anpassen"-Muster (React-Doku, kein `useEffect`) zieht spätere Änderungen
 * von außen nach (z. B. ein programmatisches Zurücksetzen ohne
 * Seiten-Reload), ohne einen zusätzlichen Render-Zyklus zu erzwingen. Geteilt
 * von `MeepleCombobox` und `MemberCombobox` — beide hatten identisch den
 * Bug, DRY-Ort ist der fachfreie `ui/`-Layer.
 */
export function useControlledComboboxInput(selectedName: string | null) {
  const [inputValue, setInputValue] = useState(selectedName ?? "");
  const [trackedSelectedName, setTrackedSelectedName] = useState(selectedName);

  if (selectedName !== trackedSelectedName) {
    setTrackedSelectedName(selectedName);
    setInputValue(selectedName ?? "");
  }

  return [inputValue, setInputValue] as const;
}
