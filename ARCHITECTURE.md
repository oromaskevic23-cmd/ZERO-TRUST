# ZERO TRUST — Architecture v0.1

Verifies a signed, short-lived laboratory AI Passport against an explicitly trusted Ed25519 public key, expected organization, audience, subject and capability.

## Architecture contract

Architect / Owner → HANTER → federated domain orchestrators → dynamically sized Nano Core Agents. AI Passport identifies the workload; Enterprise Skills describe capabilities; neither grants execution authority. ZERO TRUST checks identity and resource access, GUARDIAN CORE evaluates deterministic policies, APPROVAL GATEWAY controls execution permits, AUDIT LEDGER records evidence, CYBER HAK detects and responds to threats. ORION is advisory. ProofGraph and independent QA bind claims to evidence. IntentLock binds intent to a target.

Architect Veto Protocol: active veto takes precedence over ordinary approval; a veto denies authority, never grants new authority. Owner Kill Switch remains separate. Real iPhone biometric-gated key enrollment, secure recovery, signed root commands, durable revocation and distributed enforcement require private integration and independent validation. No biometric data, operational secrets or production keys belong here. Preserve Public/Private Boundary and CRYPTO IMPERIAL Ecosystem Boundary. Deny by default; fail closed at protected boundaries.

## Release gates

- Independently reproduce local tests at an exact commit.
- Validate cross-component integration with synthetic identities; exercise stale state, replay, tampering, cross-tenant access and veto precedence.
- Validate persistent transactions, resource-side enforcement, key lifecycle, failure recovery and independent security review.
- Require actual iPhone enrollment and end-to-end Owner authorization before claiming Face ID or production veto.
- Production readiness requires deployment and verified operational evidence; FREE_ONLY until separately authorized.

This repository is an isolated reference, not a deployed service, certification or claim of enterprise production readiness.

## Current boundary

Workload attestation, certificate rotation, live revocation, transport identity and resource-side enforcement are not implemented.
