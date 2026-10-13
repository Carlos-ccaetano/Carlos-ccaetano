<img alt="Profile card for CARLOS CAETANO, Backend Developer · Payments. I'm a backend developer working on payments in Elixir. I study API security too, mostly because breaking things teaches you how to build them better. When I'm away from the keyboard I'm usually on a trail, on a climbing wall, or practicing the saxophone (not well, but regularly). Stack: Elixir, Phoenix, Ecto, Oban, PostgreSQL, Docker, AWS, GitHub Actions, Python, Java. Certifications: Certified API Red Team Analyst (API-RTA) · CyberWarFare Labs." src="assets/hero.svg" width="100%">

[GitHub](https://github.com/Carlos-ccaetano)

<details><summary>Read as text</summary>

I'm a backend developer working on payments in Elixir. I study API security too, mostly because breaking things teaches you how to build them better. When I'm away from the keyboard I'm usually on a trail, on a climbing wall, or practicing the saxophone (not well, but regularly).

STACK: Elixir, Phoenix, Ecto, Oban, PostgreSQL, Docker, AWS, GitHub Actions, Python, Java

CERTIFICATIONS: Certified API Red Team Analyst (API-RTA) · CyberWarFare Labs

</details>

## 01 / SELECTED WORK

One system, two focused components: Tidewake handles delivery; Ironhold handles receiving and verification.

### [Tidewake](https://github.com/Carlos-ccaetano/Tidewake)

`WEBHOOK DELIVERY · ELIXIR · PHOENIX · PUBLIC · EARLY`

A webhook delivery service built around durable ingestion and recoverable background work.

- Persists events, delivery records, and the initial Oban job in one database transaction.
- Signs exact payload bytes with HMAC-SHA256 and records each delivery attempt.
- Recovers stale work and rejects unsafe resolved destinations before delivery.

**NOT YET:** Mature retry policies, secret rotation, or production operations.

### [Ironhold](https://github.com/Carlos-ccaetano/Ironhold)

`WEBHOOK RECEIVER · ELIXIR · SECURITY · PUBLIC · EARLY`

The companion receiver: it verifies webhook authenticity before accepting and persisting an event.

- Verifies HMAC-SHA256 signatures against the exact request body within a bounded timestamp window.
- Checks that header and payload event IDs agree before accepting the request.
- Stores accepted events under a unique ID with explicit duplicate and validation responses.

**NOT YET:** Broader replay controls, secret rotation, or production operations.
