# Útiterv Studio – BETA 3.0

## Új: AI kiadási ügynök
Új `agent.html` felület olyan OFA munkatársaknak, akik nem szeretnék a vizuális / JSON szerkesztőt használni.

Workflow:
1. természetes nyelvű utasítás;
2. Word/PDF/JSON/kép csatolás;
3. AI feldolgozás;
4. automatikus teszt / validáció;
5. build + staging előnézet;
6. emberi jóváhagyás;
7. kiadás.

## Hostingfüggetlen
A kliens nem Netlify-specifikus. Az AI backend URL-je konfigurálható. A tényleges AI/API kulcs és publikálási jogosultság csak a szerveren marad.

## Biztonság
Az alapértelmezett workflow védett: AI nem publikálhat emberi jóváhagyás nélkül.

## Ebben a csomagban
- teljes AI Agent frontend;
- aszinkron job/polling támogatás;
- staging / artifact / release UI;
- dokumentumcsatolás;
- kéréscsomag JSON export;
- demó mód a workflow bemutatásához (egyértelműen jelölve: nem fut valódi AI);
- `AI-AGENT-API-CONTRACT.md` backend szerződés;
- haladó szerkesztőből közvetlen „AI kiadás” belépési pont.

A tényleges AI-kódoláshoz és automatikus publikáláshoz az OFA végleges infrastruktúráján a dokumentált szerveroldali API-t kell implementálni.
