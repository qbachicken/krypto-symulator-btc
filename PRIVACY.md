# Informacja o prywatności (Privacy Notice)

**Wersja dokumentu: 24 października 2026 r.**

## Ważne zastrzeżenie

Ten dokument przygotowano na podstawie widocznego kodu aplikacji. Nie mamy dostępu do wszystkich ustawień hostingu, logów infrastruktury ani praktyk retencji danych dostawców zewnętrznych. Dlatego opisuje zachowanie aplikacji, ale sam w sobie nie potwierdza pełnej zgodności całej publikacji z RODO ani nie zastępuje analizy administratora danych.

## 1. Dane przechowywane w przeglądarce

Aplikacja zapisuje lokalnie, w pamięci localStorage przeglądarki, następujące informacje:
- wirtualne saldo PLN i BTC;
- sumę wartości używaną do obliczenia średniej ceny zakupu;
- historię symulowanych transakcji, w tym czas, cenę, ilość, kwotę i symulowaną prowizję;
- ostatni znany kurs BTC/PLN, zmianę 24-godzinną i czas zapisu.

W kodzie odpowiadają za to klucze kryptosymulator_state oraz kryptosymulator_last_price. Aplikacja nie wysyła własnego portfela ani historii transakcji do dedykowanego backendu, ponieważ aktualna wersja nie posiada takiego backendu. Nie oznacza to, że lokalne dane są szyfrowane: są przechowywane przez mechanizm pamięci przeglądarki w ramach danego profilu i originu.

Dane lokalne mogą być dostępne osobom mającym dostęp do urządzenia lub profilu przeglądarki. Mogą zostać usunięte przez wyczyszczenie danych witryny, zmianę profilu lub działanie przeglądarki. Przycisk resetu czyści portfel i historię, ale nie usuwa osobnego zapisu ostatniego kursu. Aby usunąć oba zapisy, wyczyść dane witryny w ustawieniach przeglądarki.

## 2. Połączenia z dostawcami zewnętrznymi

Kod strony kontaktuje się z następującymi usługami:
- **CoinGecko API** — kurs BTC/PLN, zmiana 24-godzinna i dane wykresu;
- **Tailwind CSS CDN** — style interfejsu;
- **jsDelivr** — biblioteka Chart.js;
- **unpkg** — biblioteka ikon Lucide;
- **Google Fonts** — font Inter.

Podczas takich połączeń dostawcy mogą otrzymywać zwykłe dane techniczne wymagane do obsługi żądania, takie jak adres IP, informacje nagłówków połączenia lub dane diagnostyczne. Dokładny zakres, podstawa prawna, lokalizacja i okres przechowywania zależą od każdego dostawcy, konfiguracji hostingu i jego aktualnych dokumentów. Aplikacja nie ustala tych praktyk i nie potrafi ich w pełni zweryfikować.

Service worker może przechowywać pliki aplikacji i zasoby z wymienionych CDN-ów w pamięci podręcznej przeglądarki. Zapytania do CoinGecko są pomijane przez cache service workera i są realizowane z sieci. Kod repozytorium nie zawiera własnego modułu analitycznego ani reklamowego; nie jest to jednak zapewnienie dotyczące tego, co robią niezależnie hosting lub dostawcy zewnętrzni.

## 3. Hosting

Strona jest statyczna i może być publikowana przez GitHub Pages. Platforma hostingowa może przetwarzać dane techniczne związane z żądaniami i bezpieczeństwem zgodnie z własnymi zasadami. Samo repozytorium nie ujawnia pełnych konfiguracji hostingu ani okresów przechowywania logów.

Zapoznaj się z dokumentami dostawców:
- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement);
- [CoinGecko Terms of Service](https://www.coingecko.com/en/terms);
- [Google Privacy Policy](https://policies.google.com/privacy);
- [jsDelivr](https://www.jsdelivr.com/);
- [unpkg](https://unpkg.com/).

## 4. Cookies i podobne technologie

Kod aplikacji nie zapisuje własnych plików cookie. Używa jednak localStorage oraz service workera i cache przeglądarki, które są innymi mechanizmami przechowywania danych na urządzeniu. Sam hosting lub usługi zewnętrzne mogą stosować własne technologie; ich użycie należy zweryfikować w politykach tych dostawców.

## 5. Kontakt i kompletność informacji

Publiczny profil właściciela repozytorium: [github.com/qbachicken](https://github.com/qbachicken). Nie umieszczaj danych osobowych ani poufnych informacji w publicznych zgłoszeniach GitHub Issues.

Jeżeli publikacja podlega obowiązkom informacyjnym RODO, osoba lub podmiot będący administratorem powinien przed traktowaniem tego pliku jako pełnej informacji prawnej uzupełnić i zweryfikować wymagane dane administratora, dane kontaktowe, cele i podstawy prawne przetwarzania, odbiorców, transfery oraz pozostałe informacje odpowiednie dla rzeczywistej konfiguracji. Nie da się odpowiedzialnie wywnioskować wszystkich tych elementów wyłącznie z kodu statycznej strony.

## English summary

The application stores its simulated portfolio, transaction history, and last known quote in the browser's localStorage. The current code has no application backend, user login, or built-in analytics module. The browser makes requests to CoinGecko and external asset providers (Tailwind CDN, jsDelivr, unpkg, and Google Fonts); those providers and the hosting platform may process technical connection data under their own policies. This code-based notice cannot verify hosting logs, retention periods, or every provider's processing, and should not be treated as a complete GDPR notice until the responsible operator confirms and completes the required details.

## Materiały informacyjne

- [RODO — tekst w EUR-Lex](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32016R0679).
- [UODO — RODO i akty towarzyszące](https://uodo.gov.pl/pl/404).

To opis techniczny wstępny, a nie potwierdzenie zgodności z RODO.
