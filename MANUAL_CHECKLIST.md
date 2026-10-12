# Manual checklist

These account and repository settings require manual changes in GitHub.

## Public profile

- Bio: `Backend dev (Elixir) · fintech payments · building toward AppSec`
- Company: `ATTRUS`
- Location: `Belo Horizonte, Brazil`
- Confirm the LinkedIn URL before setting the Website field; the supplied input did not include a final URL.
- Use a clean headshot or a 1-bit dithered version of it.
- Confirm whether the public role is “Backend developer intern (Elixir) @ Attrus” or “Software Engineer at ATTRUS”. The README uses the conservative “Backend developer (Elixir) @ ATTRUS” until confirmed.

## Pinned repositories

Pin no more than six repositories in this order:

1. Tidewake
2. Ironhold
3. relay_ex
4. IronLock-Password-Generator
5. Basic-Network-Scanner
6. Login-Simulator-Project

Unpin `atom-chess`. Verify that `relay_ex` exists and is accessible before pinning it.

## Account security

- Enable two-factor authentication.
- Under Public profile > Contributions, enable “Include private contributions”.
- Add and upload an SSH or GPG signing key.
- Enable Vigilant mode so signed commits show as Verified.

## This repository

- Description: `Backend systems, fintech payments, and application security`
- Website: set the confirmed LinkedIn URL.
- Topics: `profile`, `elixir`, `backend`, `fintech`, `application-security`
- Upload `docs/social-preview.png` under Settings > General > Social preview.
- Enable private vulnerability reporting.
- Enable Dependabot alerts, secret scanning, and push protection.

## Other repositories

For each repository, set a one-line description with no trailing period, add an appropriate website and topics, and upload its `docs/social-preview.png`.

Use topics such as `python`, `cli`, `security`, and `cryptography` for Python security tools; `java`, `javafx`, and `bcrypt` for the login demo; and `elixir` for Elixir projects.

Enable private vulnerability reporting, Dependabot alerts, secret scanning, and push protection. On flagship repositories, protect `main` by requiring pull requests and passing CI.

## Suggested repository names

Repository renames redirect automatically:

- `IronLock-Password-Generator` → `ironlock`
- `Basic-Network-Scanner` → `portscan`
- `Login-Simulator-Project` → `bcrypt-login-demo`
- `Email-Validator` → `email-validator`
