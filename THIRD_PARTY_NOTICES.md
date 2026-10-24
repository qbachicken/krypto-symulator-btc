# Biblioteki, dane i licencje stron trzecich

**Wersje poniżej odczytano z aktualnych odwołań w kodzie repozytorium.** Pliki bibliotek są ładowane z zewnętrznych serwerów w czasie działania aplikacji, a nie dołączone jako lokalne kopie w tym repozytorium.

## Zależności i usługi

| Zasób | Wersja / sposób użycia | Źródło | Informacja licencyjna |
|---|---|---|---|
| Tailwind CSS | CDN 3.4.17 | [CDN](https://cdn.tailwindcss.com/3.4.17) · [repozytorium](https://github.com/tailwindlabs/tailwindcss/tree/v3.4.17) | Projekt Tailwind CSS publikuje kod na licencji MIT; sprawdź pliki licencyjne dokładnej wersji. |
| Chart.js | 4.4.7 | [CDN jsDelivr](https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.js) · [repozytorium](https://github.com/chartjs/Chart.js/tree/v4.4.7) | MIT. |
| Lucide | 0.468.0 | [CDN unpkg](https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js) · [repozytorium](https://github.com/lucide-icons/lucide/tree/0.468.0) | Projekt publikuje ikony na licencji ISC; sprawdź pliki licencyjne przypiętej wersji. |
| Inter / Google Fonts | Żądanie fontu z Google Fonts API | [Google Fonts](https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap) · [źródła fontu](https://github.com/google/fonts/tree/main/ofl/inter) | Rodzina Inter w Google Fonts jest dystrybuowana na licencji SIL Open Font License 1.1. Sprawdź metadane konkretnego pliku zwróconego przez usługę. |
| CoinGecko API | Publiczne żądania kursu i historii cen BTC/PLN | [API](https://www.coingecko.com/en/api) · [warunki](https://www.coingecko.com/en/terms) | To zewnętrzna usługa danych, nie biblioteka z kodem do ponownego licencjonowania przez to repozytorium. Sprawdź aktualne warunki, limity i zasady atrybucji dla sposobu użycia. |

Licencje opisane w tabeli dotyczą wymienionych projektów zewnętrznych. Nie udzielają licencji na własny kod KryptoSymulator BTC ani nie zastępują sprawdzenia pełnych warunków danego wydania.

## Atrybucja CoinGecko — uwaga

Kod strony pokazuje etykietę „Kurs na żywo (CoinGecko)”, ale aktualny interfejs nie zawiera widocznego linku do źródła danych. Materiały CoinGecko informują, że publiczne wyświetlanie danych może wymagać wyraźnej atrybucji, zależnie od warunków i planu API. Zweryfikuj warunki dotyczące konkretnego użycia przed publiczną promocją lub szerszym udostępnianiem projektu. Interfejs nie został zmieniony w ramach tej dokumentacji, zgodnie z zakresem zatwierdzonych prac.

## Brak licencji dla własnego projektu

W repozytorium nie ma pliku LICENSE. Nie należy wnioskować z licencji MIT lub ISC bibliotek zewnętrznych, że własny kod projektu jest udostępniony na tych samych zasadach.

## English summary

This repository loads Tailwind CSS 3.4.17, Chart.js 4.4.7, Lucide 0.468.0, and Inter from Google Fonts, and fetches BTC/PLN market data from CoinGecko. The upstream projects publish their own license terms (MIT, ISC, and SIL OFL 1.1 as listed above); check the exact pinned releases and provider terms before redistribution or commercial use. No license is provided for the original KryptoSymulator BTC code. CoinGecko attribution requirements should be verified for the actual API plan and public display.

## Źródła

- [Tailwind CSS — wydanie 3.4.17](https://github.com/tailwindlabs/tailwindcss/tree/v3.4.17)
- [Chart.js — wydanie 4.4.7](https://github.com/chartjs/Chart.js/tree/v4.4.7)
- [Lucide — wydanie 0.468.0](https://github.com/lucide-icons/lucide/tree/0.468.0)
- [Google Fonts — Inter](https://github.com/google/fonts/tree/main/ofl/inter)
- [CoinGecko — opis wymogów atrybucji](https://support.coingecko.com/articles/1043089972-what-are-the-differences-between-commercial-and-custom-licenses)
