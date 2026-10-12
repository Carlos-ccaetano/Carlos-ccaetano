<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/hero-manual-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/hero-manual-light.svg">
  <img src="./assets/hero-manual-light.svg" width="100%" alt="Systems reference manual header for Carlos Caetano, a Software Engineer in Belo Horizonte working across backend systems, distributed systems, payments, and application security">
</picture>

# Carlos Caetano

**Software Engineer** · Belo Horizonte, Brazil<br>
`BACKEND / DISTRIBUTED SYSTEMS / PAYMENTS / APPLICATION SECURITY`

---

## 01 / ABOUT

I'm a software engineer at **ATTRUS**, working across payments and backend development with **Elixir, Phoenix, and PostgreSQL**.

My interests are distributed systems reliability, backend architecture, secure API design, and applied AI for cybersecurity. I prefer systems that make their failure modes visible.

---

## 02 / SELECTED WORK

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/glyph-tidewake-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/glyph-tidewake-light.svg">
  <img src="./assets/glyph-tidewake-light.svg" width="48" alt="Tidewake glyph: durable event cells feeding outbound delivery lines">
</picture>

### Tidewake

`WEBHOOK DELIVERY / ELIXIR / PHOENIX`

A webhook delivery service designed around durable ingestion and recoverable background work.

- Creates events, delivery records, and initial Oban jobs in one database transaction.
- Signs exact payload bytes with HMAC-SHA256 and records each delivery attempt.
- Recovers stale work and rejects unsafe resolved destinations before delivery.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/glyph-ironhold-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/glyph-ironhold-light.svg">
  <img src="./assets/glyph-ironhold-light.svg" width="48" alt="Ironhold glyph: a closed pixel seal containing a verification mark">
</picture>

### Ironhold

`WEBHOOK RECEIVER / ELIXIR / SECURITY`

A companion receiver that verifies webhook authenticity before accepting and persisting an event.

- Verifies HMAC-SHA256 signatures against the exact raw request body within a bounded timestamp window.
- Checks event identity across headers and payload before accepting the request.
- Stores accepted events under a unique event ID with explicit duplicate and validation responses.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/figure-delivery-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/figure-delivery-light.svg">
  <img src="./assets/figure-delivery-light.svg" width="100%" alt="Figure 1: Tidewake signs and delivers a webhook; Ironhold verifies the signature and stores the accepted event">
</picture>

*Figure 1 — Tidewake signs and delivers the webhook; Ironhold verifies the signature and stores the accepted event.*

The source repositories are currently private. Both projects are early-stage engineering studies; retry policies, broader replay controls, secret rotation, and production operations remain roadmap work.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/activity-12w-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/activity-12w-light.svg">
  <img src="./assets/activity-12w-light.svg" width="100%" alt="Figure 2: a static 12-week activity bitmap from 19 July to 10 October 2026, with five dithered density levels and the most recent complete week marked in signal red">
</picture>

*Figure 2 — Activity, 19 Jul to 10 Oct 2026. Dated snapshot; not a live graph.*

---

## 03 / TOOLKIT

```text
CORE
Elixir · Erlang/OTP · Phoenix
PostgreSQL · Oban

SYSTEMS
Docker · RabbitMQ · Linux
GitHub Actions · AWS

PRODUCT
TypeScript · React · Vue
```

---

## 04 / CONTACT

[GitHub](https://github.com/Carlos-ccaetano) · [LinkedIn](https://www.linkedin.com/in/carlos-caetano)

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/colophon-manual-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="./assets/colophon-manual-light.svg">
  <img src="./assets/colophon-manual-light.svg" width="100%" alt="Colophon: local SVG, system fonts, twelve-column grid, and no external requests">
</picture>

*Colophon — Local SVG, system fonts, a twelve-column grid, and no external requests.*
