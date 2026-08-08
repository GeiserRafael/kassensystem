# Projekt-Konzept: Flexible Event-Kassen-App (PWA)

> Dieses Dokument dient als Informations- und Konzeptgrundlage.
> Es enthält bewusst KEINE Code-Beispiele (außer Datenstrukturen).
> Konkrete Tool-, Framework- und Datenbank-Entscheidungen werden separat getroffen.

---

## 1. Projektübersicht

**Was:** Eine offline-fähige Progressive Web App (PWA) als mobile Kasse
(Point of Sale / POS) für Events, Feste und Verkaufsstände.

**Kernprinzip – Local-First:**
Die App funktioniert vollständig offline. Daten werden lokal gespeichert und
automatisch mit einem Server synchronisiert, sobald Internet verfügbar ist.
Die UI wartet nie auf das Netzwerk.

**Zielgeräte:**
- Primär: Smartphone (kleiner Bildschirm → Mobile First)
- Zusätzlich: iPad
- Anforderung: Responsive Design (Pflicht)

**Nutzer:** Betreiber und wechselnde, teils ungeübte Helfer.
→ Die Oberfläche muss extrem einfach und schnell bedienbar sein.

---

## 2. Kernfunktionen (Anforderungen)

### Verkaufen
- Produkt auswählen, Menge erhöhen (+1) und reduzieren (-1)
- Gesamtsumme sichtbar
- Rückgeld-Berechnung: Anzeige, was der Kunde gibt und zurückbekommt

### Stationen / Reiter
- Verschiedene Verkaufsstationen (z. B. Getränke, Essen, Weitere)
- Umschaltbar über Reiter
- Reiter sollen automatisch aus den vorhandenen Kategorien entstehen

### Produkte & Kategorien
- Flexibel und dynamisch anlegen/ändern (nichts fest einprogrammiert)
- Jedes Produkt hat ein Text-Label (Pflicht) UND ein Emoji-Icon
- Aktualisierbar und dauerhaft gespeichert

### Verkäufe erfassen
- Speichern: was, wann, wie viel, welcher Nutzer (alle Informationen)
- Verkäufe sind unveränderlich (Korrekturen als neuer Eintrag)

### Benutzer
- Benutzername (in Settings) oder Login-Seite

### Synchronisation
- Bei verfügbarem Internet: Daten auf einen Server hochladen/synchronisieren

---

## 3. Wichtiger Hinweis: Icons = Emojis (keine Bilder)

Statt Bilder werden **Emojis** von der Tastatur als Produkt-Icons verwendet
(z. B. 🥤 🍺 🌭 🍕 🥨).

Vorteile:
- Emojis sind reiner Text → kein zusätzlicher Speicherbedarf
- Kein Bilder-Upload und kein Cloud Storage nötig (hält das Projekt kostenlos)
- Funktionieren auf allen Geräten
- Werden einfach als String im Feld `icon` des Produkts gespeichert

Kombination Emoji + Text-Label:
- Emoji → schnelle visuelle Erkennung
- Text-Label → Eindeutigkeit, da manche Produkte optisch/vom Emoji her ähnlich sein können

---

## 4. Datenmodell (Datenstruktur)

Preise werden als Ganzzahl in Cent gespeichert (z. B. 250 = 2,50 €),
um Rundungsfehler zu vermeiden.

### Categories (Verkaufsstationen / Reiter)
- id
- name              (z. B. "Getränke")
- sortOrder         (Reihenfolge der Reiter)
- color             (optional, für Farbcodierung)
- lastModified

### Products (verkaufbare Artikel)
- id
- name              (Text-Label, Pflicht – gegen Verwechslung)
- icon              (Emoji als Text, z. B. "🥤")
- categoryId        (Verweis auf Category)
- price             (in Cent)
- isActive          (false statt löschen, um Historie zu schützen)
- isSoldOut         ("Ausverkauft"-Markierung)
- isFavorite        (Schnellzugriff)
- sortOrder
- lastModified

### Sales (abgeschlossene Verkäufe – UNVERÄNDERLICH)
- id                (client-generierte, eindeutige ID / UUID)
- userId
- createdAt
- type              ("sale" | "void" – Storno = neuer Eintrag)
- lineItems         (Liste von Positionen):
    - productId
    - name
    - qty
    - unitPrice
    - lineTotal
- total             (in Cent)
- given             (gegebener Betrag)
- change            (Rückgeld)
- deviceId          (welches Gerät)

### Users (Benutzer)
- id
- name

### Presets (gespeicherte Situationen)
- id
- name              (z. B. "Sommerfest")
- productIds        (welche Produkte zur Situation gehören)

---

## 5. App-Struktur (3 Hauptansichten)

### 5.1 Verkauf (Hauptansicht)
- Reiter oben: automatisch aus den Kategorien der aktiven Produkte generiert;
  leere Kategorien werden ausgeblendet
- Produkt-Buttons: groß, mit Emoji + Text-Label, farblich nach Kategorie
- Warenkorb: pro Position Menge mit + und - (auf 0 = Position entfernen)
- Gesamtsumme: groß und prominent
- Rückgeld-Rechner: Feld "Gegeben" berechnet automatisch das Rückgeld;
  Schnellwahl-Buttons (z. B. 5€, 10€, 20€, passend)
- Bezahlen-Button: groß, grün, feste Position, in Daumenreichweite
- "Letzten Artikel entfernen" / Undo: immer griffbereit

### 5.2 Settings / Produkt-Datenbank
- Produkte verwalten: anlegen, ändern (Name/Label, Emoji, Preis, Kategorie),
  Ausverkauft, Favorit, aktiv/inaktiv
- Kategorien verwalten
- Presets (Situationen) anlegen und umschalten
- Benutzername eingeben

### 5.3 Auswertung (spätere Ausbaustufe)
- Tagesabschluss (Z-Bericht): Gesamtumsatz, Anzahl Verkäufe, Top-Produkte,
  Aufschlüsselung pro Nutzer/Gerät
- Statistik (z. B. Umsatz pro Stunde)
- Sync-Status-Anzeige

---

## 6. UI/UX-Design-Regeln (kritisch für eine Kassen-App)

Leitprinzip:
"Lösche jeden Schritt, der weder ändert, was der Kunde zahlt,
noch was das System speichert."

- Mobile First: erst fürs Handy designen, dann fürs iPad erweitern
  (auf dem iPad z. B. Warenkorb neben den Produkten statt darunter)
- Große Touch-Flächen: fingerfreundlich, genug Abstand gegen Fehl-Taps
- Ziel: maximal 2 Taps pro Verkauf (Produkt tippen = +1, dann Bezahlen)
- Text-Labels an Produkten (nicht nur Emoji/Farbe – manche Produkte ähneln sich)
- Emoji + Label kombinieren: schnelle Erkennung UND Eindeutigkeit
- Farbcodierung konsequent:
    - Grün = Bezahlen / positive Aktion
    - Rot = Storno / Löschen
    - Kategorien optisch unterscheidbar
- Positive und negative Buttons räumlich trennen (Bezahlen nicht neben Löschen)
- Sofortiges visuelles Feedback beim Tippen
- Bildschirm aufgeräumt halten: Settings/Statistik im Hintergrund,
  nicht im Verkaufsweg
- Große, kontrastreiche Schrift (Outdoor-tauglich, ggf. Dark Mode)
- Fehlerbehebung statt Sackgassen: Undo, "letzten Artikel entfernen"
- Feste Positionen für häufige Buttons (Muskelgedächtnis)
- Empfehlung: mit einer ungeübten Person testen, nicht nur mit sich selbst

---

## 7. PWA-Anforderungen (allgemein)

Damit die App wie eine echte App vom Homescreen läuft (Standalone-Modus),
sind folgende Bausteine nötig:

- HTTPS (Pflicht)
- Web App Manifest (Name, Icons, start_url, display: standalone,
  Theme-/Background-Farbe)
- iOS-spezifische Meta-Tags im <head> (Web-App-Fähigkeit, Titel,
  apple-touch-icon), da iOS die Manifest-Icons nicht für den Homescreen nutzt
- App-Icons in mind. 192x192 und 512x512 px (inkl. "maskable" für Android)
- Service Worker: cached die App-Shell (HTML/CSS/JS), damit die App
  offline startet

Plattform-Hinweise:
- Android/Chrome: automatischer Installations-Prompt möglich; echte App-
  Installation (Standalone-Fenster). Manifest-Icons werden verwendet.
- iOS/Safari: Installation nur manuell über "Teilen → Zum Home-Bildschirm";
  benötigt apple-touch-icon; strengere Speicherlimits, Service Worker werden
  im Hintergrund häufiger beendet.

---

## 8. Offline-Konzept

- Die App muss ohne Internet vollständig verkaufen können.
- Alle Lese-/Schreibvorgänge gehen zuerst auf den lokalen Speicher.
- Verkäufe werden sofort lokal gespeichert (nie auf das Netzwerk warten).
- Bei wiederhergestellter Verbindung werden die Daten mit dem Server
  synchronisiert.
- Statt "Keine Verbindung"-Meldungen: einen Sync-Status anzeigen
  (z. B. "Noch nicht synchronisiert" / "Synchronisiert").

Wichtige Prinzipien für die Datensicherheit:
- Verkäufe unveränderlich halten (Korrektur = neuer Storno-Eintrag)
- Verkaufs-IDs client-seitig als eindeutige UUID erzeugen
  (offline-tauglich, verhindert Duplikate beim Sync)
- Produkte nicht löschen, sondern inaktiv setzen (schützt alte Verkäufe)

---

## 9. Hosting-Konzept

- Die App wird als statische Website ausgeliefert.
- Ein statisches Hosting liefert HTTPS und die App-Dateien.
- Die Datenbank/Backend läuft separat und wird direkt per HTTPS
  aus der App angesprochen.
- Bei projektbasiertem Hosting kann die App unter einem Unterpfad liegen
  (z. B. /repo-name/) → Router- und Asset-Pfade müssen darauf abgestimmt werden.

---

## 10. Wichtige Fallstricke / To-Beachten

- Preise als Ganzzahl in Cent speichern (keine Fließkommazahlen).
- Verkaufs-IDs client-seitig als UUID generieren.
- Zugriffsregeln/Security der Datenbank unbedingt setzen
  (öffentliche Auslieferung → Daten müssen serverseitig geschützt werden).
- Verkäufe unveränderlich halten.
- Datenschutz bei geteilten Geräten: Funktion "Abmelden / lokale Daten löschen"
  anbieten (lokaler Cache wird nicht automatisch geleert).
- Emojis sind Text → im Feld `icon` als String speichern, kein Bild-Upload nötig.
- Rechtlicher Hinweis (Deutschland): Bei gewerblicher Nutzung ggf.
  GoBD / Kassensicherungsverordnung (TSE-Pflicht) prüfen. Für private oder
  vereinsinterne Nutzung meist unkritisch.

---

## 11. Empfohlene Umsetzungs-Reihenfolge (MVP)

Empfehlung: zuerst alles offline-funktionsfähig bauen, danach den Server-Sync
ergänzen.

1. Projekt-Setup (Frontend + Datenbank-Anbindung, Offline-Speicherung aktivieren)
2. Datenmodell anlegen
3. Verkaufsansicht mit automatisch generierten Reitern + Produkt-Buttons
   (Emoji + Label) + Warenkorb (+/-)
4. Rückgeld-Berechnung
5. Verkäufe speichern (client-UUID, unveränderlich, Cent-Preise)
6. Settings: Produkte/Kategorien verwalten + Presets + Benutzername
7. Login
8. PWA installierbar machen (Manifest, Icons, Service Worker)
9. Zugriffsregeln / Security setzen
10. Deploy auf statisches Hosting
11. Spätere Ausbaustufen: Storno, Tagesabschluss, Statistik,
    Ausverkauft, Favoriten

---

## 12. Offene Entscheidungen (bewusst nicht festgelegt)

Diese Punkte werden in einer separaten Session entschieden:

- Frontend-Framework (z. B. komponentenbasiert oder minimalistisch)
- Build-/Dev-Werkzeuge
- Konkrete Datenbank/Backend-Lösung (Cloud-basiert oder selbst gehostet)
  - Hinweis: Manche Lösungen bringen Offline-Sync eingebaut mit,
    bei anderen muss die Sync-Logik selbst umgesetzt werden.
- Authentifizierungs-Methode (einfacher Benutzername vs. echter Login)
- Hosting-Plattform
- App-Name und Farbschema
- Ob und welche Erweiterungen (Bundles, Rabatte, Zahlungsarten, Multi-Device)
