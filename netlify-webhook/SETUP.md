# Konfiguracja: Stripe → Netlify → SendGrid

## 1. Struktura plików
Dodaj do swojego projektu Netlify:
```
netlify.toml                          ← do głównego folderu projektu
netlify/functions/stripe-webhook.js   ← nowy folder + plik
netlify/functions/package.json        ← zależności
```

---

## 2. Zmienne środowiskowe w Netlify
Wejdź w: **Netlify Dashboard → Site → Environment variables → Add variable**

| Nazwa | Wartość |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` (z Stripe Dashboard → Developers → API keys) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (z kroku 3 poniżej) |
| `RESEND_API_KEY` | `re_xxx...` (z kroku 4 poniżej) |

---

## 3. Konfiguracja webhooka w Stripe
1. Wejdź w **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL endpointu: `https://TWOJA-STRONA.netlify.app/.netlify/functions/stripe-webhook`
3. Wybierz event: `checkout.session.completed`
4. Po stworzeniu skopiuj **Signing secret** (`whsec_...`) → wklej jako `STRIPE_WEBHOOK_SECRET`

---

## 4. Konfiguracja Resend
1. Załóż konto na **resend.com** (free tier: 3000 emaili/miesiąc)
2. Przejdź do **API Keys → Create API Key**
3. Skopiuj klucz (`re_xxxxxxxxx`) → wklej jako `RESEND_API_KEY` w Netlify
4. Na starcie możesz używać `onboarding@resend.dev` jako adresu nadawcy (już skonfigurowany)
5. Docelowo warto dodać własną domenę w **Domains** dla lepszej dostarczalności

---

## 5. Deploy
Wrzuć pliki do swojego repo → Netlify sam zbuduje funkcję.

Adres webhooka będzie: `https://TWOJA-STRONA.netlify.app/.netlify/functions/stripe-webhook`

---

## Testowanie
W Stripe Dashboard → Webhooks → kliknij swój endpoint → **Send test webhook** → wybierz `checkout.session.completed`

Możesz też zrobić testowy zakup w trybie testowym Stripe (użyj karty `4242 4242 4242 4242`).
