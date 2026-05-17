# Security policy

## Supported versions

This package is pre-1.0 and ships from `main`. Security fixes land on
`main` and a new patch release is cut.

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Reporting a vulnerability

**Do not open a public issue for security reports.**

Please use GitHub's private security advisory flow:

1. Go to https://github.com/StbanMc/siigo-cliente-node/security/advisories
2. Click "Report a vulnerability"
3. Describe the issue with as much detail as you can: affected version,
   how to reproduce, and what an attacker could do with it.

I aim to acknowledge reports within 72 hours. After triage we'll agree
on a disclosure timeline — typically 30 days for low-severity issues,
sooner for anything that exposes credentials or PII.

## What's in scope

- Mishandling of Siigo credentials (logging them, leaking them, sending
  them on requests that shouldn't have them)
- Auth flaws (token refresh races, accidental token reuse)
- Memory leaks of sensitive data
- Bugs that could be turned into an SSRF or arbitrary URL access via
  caller-supplied input that the SDK fails to sanitise

## What's out of scope

- Bugs in Siigo's API itself (report those to Siigo)
- Issues that require an attacker who already has your credentials
- Vulnerabilities in `node`, `npm`, or your local dev environment

Thank you for helping keep this SDK safe to depend on.
