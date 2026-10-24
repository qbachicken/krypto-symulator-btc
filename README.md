# KryptoSymulator BTC

**Edukacyjny symulator portfela BTC/PLN. Nie jest to giełda ani prawdziwy portfel kryptowalut.**

[Zastrzeżenia](DISCLAIMER.md) · [Warunki korzystania](TERMS.md) · [Prywatność](PRIVACY.md) · [Bezpieczeństwo](SECURITY.md) · [Biblioteki i licencje](THIRD_PARTY_NOTICES.md)

## Co to robi?

KryptoSymulator BTC to statyczna aplikacja przeglądarkowa pozwalająca przećwiczyć hipotetyczne kupowanie i sprzedawanie Bitcoina przy użyciu wirtualnego salda. Aplikacja odczytuje rynkowe dane BTC/PLN z CoinGecko, ale **nie przesyła zleceń na giełdę i nie obsługuje prawdziwych pieniędzy ani kryptowalut**.

Funkcje widoczne w kodzie:
- wirtualne saldo początkowe 100 PLN;
- symulowane kupno i sprzedaż BTC z założoną prowizją 0,2%;
- szacowanie ilości BTC lub PLN przed wykonaniem symulowanej operacji;
- wykres danych cenowych dla zakresów 24H, 7D, 30D, 1R i MAX;
- historia symulowanych operacji oraz podsumowanie wartości portfela;
- lokalny zapis stanu i możliwość zresetowania portfela;
- instalacja jako aplikacja PWA i ograniczony tryb offline.

Wyniki są wyłącznie demonstracją obliczeń. Model nie uwzględnia wszystkich warunków realnego rynku, takich jak spread, poślizg cenowy, płynność, zasady konkretnej giełdy, podatki ani rzeczywiste wykonanie zlecenia.

## Jak to działa?

- **Ceny:** aplikacja pobiera kurs BTC/PLN i zmianę 24-godzinną z publicznego API CoinGecko. Kurs jest odświeżany okresowo. Kod blokuje symulowane operacje, gdy kurs jest nieobecny lub starszy niż przyjęty limit pięciu minut. Dane wykresu są pobierane osobno.
- **Symulowane transakcje:** saldo i historia są obliczane po stronie przeglądarki. Prowizja 0,2% to stałe założenie symulatora, a nie opłata pobierana przez giełdę.
- **Dane lokalne:** stan portfela jest zapisywany w pamięci localStorage przeglądarki pod kluczem kryptosymulator_state. Ostatni odczyt kursu jest zapisywany oddzielnie pod kluczem kryptosymulator_last_price.
- **Brak konta i backendu:** bieżący kod nie implementuje logowania, serwerowego portfela, połączenia z kontem giełdowym ani wykonywania prawdziwych transakcji.
- **PWA i cache:** service worker może przechowywać pliki aplikacji oraz zasoby z wymienionych CDN-ów. Kurs CoinGecko jest pobierany z sieci, więc aktualne dane rynkowe wymagają działającego połączenia.
- **Reset:** przycisk resetuje wirtualne saldo i historię portfela. Ostatni zapamiętany kurs jest przechowywany osobno i może pozostać. Aby usunąć oba rodzaje danych, wyczyść dane witryny w ustawieniach przeglądarki.

Szczegóły dotyczące danych zewnętrznych i ograniczeń prywatności znajdują się w [PRIVACY.md](PRIVACY.md).

## Uruchamianie i publikacja

To statyczna aplikacja HTML/CSS/JavaScript. Nie wymaga etapu kompilacji ani własnego serwera API.

1. Opublikuj pliki repozytorium przez GitHub Pages lub uruchom je przez lokalny serwer statyczny.
2. Otwórz stronę w przeglądarce z dostępem do internetu, aby pobrać aktualne kursy i zależności zewnętrzne.
3. Do działania service workera potrzebny jest bezpieczny kontekst, zwykle HTTPS albo localhost. Otwieranie pliku bezpośrednio przez file:// może nie zapewnić pełnej funkcjonalności PWA.

Nie należy wpisywać do tej aplikacji haseł, kluczy API, fraz seed ani danych kont giełdowych. Nie ma funkcji, która wymaga takich danych.

## Technologie i zasoby zewnętrzne

- HTML, CSS i JavaScript;
- Tailwind CSS CDN 3.4.17;
- Chart.js 4.4.7;
- Lucide 0.468.0;
- Inter z Google Fonts;
- CoinGecko API do danych cenowych.

Zobacz [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) w sprawie dostawców, źródeł i licencji.

## Vibecoding i ograniczenia audytu

Projekt był **vibecoded**, czyli tworzony z pomocą narzędzi AI do generowania i poprawiania kodu. Sugerowane przez AI fragmenty mogą zawierać błędy, a sam fakt użycia AI nie potwierdza poprawności ani bezpieczeństwa. Projekt nie został profesjonalnie audytowany pod kątem prawnym, finansowym ani bezpieczeństwa.

Dokumentacja opisuje zachowanie widoczne w kodzie w chwili jej przygotowania. Nie stanowi certyfikacji, gwarancji działania ani opinii prawnej.

## Brak licencji projektu

Repozytorium nie zawiera pliku LICENSE i niniejsza dokumentacja go nie dodaje. **Nie zakładaj, że publiczny dostęp do repozytorium oznacza zgodę na kopiowanie, modyfikowanie, redystrybucję lub ponowne licencjonowanie własnego kodu projektu.** W zakresie, w jakim prawo nie przyznaje takich uprawnień niezależnie, wymagana jest odrębna zgoda właściciela praw. Zewnętrzne biblioteki i zasoby podlegają własnym licencjom, opisanym w [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Ważne przed publicznym udostępnianiem

Kod strony pokazuje nazwę CoinGecko w statusie kursu, ale obecnie nie zawiera widocznego linku atrybucyjnego do dostawcy danych. Opublikowane wytyczne CoinGecko wskazują, że publicznie prezentowane dane mogą wymagać wyraźnego przypisania źródła. Zweryfikuj warunki API dla używanego planu i potraktuj ewentualne dostosowanie widocznego interfejsu jako osobną zmianę kodu. Nie zmieniono interfejsu w ramach tej dokumentacji.

## English summary

KryptoSymulator BTC is a browser-based educational simulator. It uses CoinGecko market data to calculate hypothetical BTC/PLN purchases and sales, but it does not execute real trades, hold real funds, connect to an exchange account, or provide investment advice. The virtual portfolio and transaction history are stored in the user's browser. The project was vibecoded with AI assistance and has not received a professional legal, financial, or security audit. No project-wide software license is included; access to a public repository should not be treated as a blanket permission to reuse its original code.

## Dokumenty

- [DISCLAIMER.md](DISCLAIMER.md) — ryzyka i charakter symulacji.
- [TERMS.md](TERMS.md) — zasady korzystania.
- [PRIVACY.md](PRIVACY.md) — dane lokalne, hosting i dostawcy zewnętrzni.
- [SECURITY.md](SECURITY.md) — zgłaszanie problemów bezpieczeństwa.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — wykaz zależności i ich licencji.
