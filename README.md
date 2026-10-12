<p align="center">
  <img src="./assets/profile-banner.jpg" width="100%" alt="Abstract network of events converging on a protected service" />
</p>

<h1 align="center">Carlos Caetano</h1>

<p align="center">
  <strong>Backend engineering · distributed systems · application security</strong>
</p>

<p align="center">
  Building reliable services for the places where asynchronous work, external integrations, and security boundaries meet.
</p>

<p align="center">
  <a href="https://github.com/Carlos-ccaetano">GitHub</a> ·
  <a href="https://www.linkedin.com/in/carlos-caetano">LinkedIn</a>
</p>

---

## About

I work in software engineering at **ATTRUS**, contributing to backend systems in a financial-technology environment. My focus is Elixir/Phoenix services, asynchronous processing, and APIs designed around explicit failure and security boundaries.

I'm completing a bachelor's degree in Computer Science at **Faculdade Dom Helder Câmara**. Outside work, I build focused projects that turn reliability and security concepts into code I can test, inspect, and improve.

## Featured engineering projects

### [Tidewake](https://github.com/Carlos-ccaetano/Tidewake)

An early-stage webhook delivery service exploring durable ingestion and recoverable asynchronous processing.

- Built with Elixir, Phoenix, Ecto, PostgreSQL, and Oban.
- Creates the event, delivery records, and initial background jobs in one database transaction.
- Tracks delivery attempts, signs exact payload bytes with HMAC-SHA256, recovers stale work, and emits Telemetry events.
- Validates outbound targets and rejects unsafe resolved addresses before delivery.

**Current boundary:** at-least-once recovery is implemented; automated retry/backoff policies and production operations remain roadmap work.

### [Ironhold](https://github.com/Carlos-ccaetano/Ironhold)

A companion receiver focused on authenticated webhook ingestion and conservative request handling.

- Verifies HMAC-SHA256 signatures against the exact raw request body within a bounded timestamp window.
- Checks event identity across headers and payload before accepting the request.
- Persists accepted events under a unique event ID and returns explicit duplicate or validation responses.
- Emits low-cardinality Telemetry signals for authentication and ingestion paths.

**Current boundary:** broader replay controls, secret rotation, rate limiting, and operational tooling remain roadmap work.

Together, the repositories document and exercise this local flow:

> **Event → Tidewake → signed webhook → Ironhold**

They remain independent, early-stage services rather than a production deployment.

## Toolkit

- **Core backend:** Elixir · Erlang/OTP · Phoenix · Ecto · PostgreSQL · Oban
- **Infrastructure and delivery:** Docker · RabbitMQ · Linux · GitHub Actions
- **Additional experience:** TypeScript · React · Vue.js · AWS integrations, including Cognito

## Engineering interests

- Distributed systems reliability and recoverable asynchronous work
- Secure API and integration-boundary design
- Application security, threat modeling, and defensive review
- AI-assisted security analysis and anomaly detection

## Education and credentials

**Bachelor's degree in Computer Science** — Faculdade Dom Helder Câmara

- GitHub Actions (GH-200)
- API Red Team Analyst (API-RTA)
- Google Cybersecurity Professional Certificate
- Ethical Hacker — IBSEC
- Linux Security — IBSEC

## Connect

[GitHub](https://github.com/Carlos-ccaetano) · [LinkedIn](https://www.linkedin.com/in/carlos-caetano)

---

<p align="center">
  <strong>Build reliable systems. Understand how they fail. Design them to fail safely.</strong>
</p>
