# FRIDAY foundation — Phase 0 and MVP

FRIDAY is an experimental local-first application. The former JARVIS application and deployment assets have been removed from the working tree; Git history remains unchanged. It is a foundation, **not** the complete system described in the blueprint.

## Environment and feasibility (2026-10-31)

The Arena checkout provides Python 3.11, Node 22, Git and a browser preview; this sandbox has 2 CPUs, ~3.8 GiB RAM, ~20 GiB free disk, no detected GPU or Ollama executable. Network access is restricted to selected package/GitHub hosts. Hardware reported is the sandbox, not the owner's device. Local model inference is therefore **not demonstrated here**; a small quantized model may work on another machine, but RAM requirements and latency vary. GitHub is available via `gh`; Linear and Supabase are enabled in the session but no account data or integrations are used. Arena's tools are development tools, not runtime permissions or integrations for FRIDAY.

| Classification | Capabilities |
|---|---|
| Implemented now | Local web UI, token-gated API, SQLite persistence, owner-created/corrected/deleted memories, client-side keyword filtering and JSON export, conversation history, Ollama adapter, optional OpenAI API-key adapter, opt-in keyword memory retrieval, persistent tasks, bounded specialist draft/review workflow, model availability and honest failure, basic audit events. |
| Connector-dependent | OpenAI inference requires a separately configured API key and network connectivity. Research, GitHub, email, calendars, workflow services and sync require integrations and scoped permissions; none are connected to this app. |
| Hardware/software-dependent | Ollama and a downloaded model for inference; microphone, camera, local speech and vision need hardware, permission, software and explicit consent. |
| Future | Semantic search, general-purpose agents, model routing, action approval, encrypted credentials, proactive jobs, backups UI, biometric authentication, sandboxed execution and independent fact verification. No autonomous actions are enabled. |

## Run locally

Requires Python 3.9+; no Python packages. Generate a strong token locally, keep it private, and pass it in the environment (do not put it in a shell history or repository). For example:

```sh
export FRIDAY_TOKEN="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
printf 'FRIDAY token: %s\n' "$FRIDAY_TOKEN"
python3 friday/server.py
```

Open http://127.0.0.1:8765 and enter the token. The token is kept in tab session storage until lock/tab close. Default bind is loopback. **Do not expose the server directly to the internet or a shared network**: HTTP is unencrypted, a bearer token is not a complete owner-identity/session system, and this MVP lacks brute-force protection. For remote access, use a separately secured TLS/authenticated gateway and threat review, or wait for hardened deployment support.

For actual conversation, install and run Ollama locally and pull `llama3.2:3b` (or set `FRIDAY_MODEL` to an installed model). In offline mode the app uses only `127.0.0.1:11434`; it never automatically switches to cloud. Offline inference works only after the model is already downloaded and the local server is running. Without a model, messages are saved and the UI reports failure; no fake reply is created. For each conversation message, the owner can opt in to keyword-based retrieval of up to five saved memories. In online mode those selected memories are sent to the provider along with recent chat history. Retrieval is approximate, not semantic, and may miss or incorrectly match information. It does not automatically create memories. Search filters the first 500 returned memories by substring; export includes those returned memories only. There is no semantic search yet.

Default database: `~/.friday/friday.db`, override with `FRIDAY_DB`. The app creates the directory with restrictive permissions and attempts to set the database to mode 0600; existing directory permissions are not modified. SQLite data is **not encrypted**. Use OS disk encryption and appropriate filesystem access controls. The token is not stored by the server. Chat and memory are plaintext in SQLite. Audit records contain action type and memory ID, not memory content. The database includes deleted content potentially in SQLite free pages/backups; deletion is logical, not secure erasure. To back up consistently while running, use SQLite's backup API or `sqlite3 ~/.friday/friday.db '.backup backup.db'`; secure the copy. Restore with the server stopped, after preserving the current database. No automated restore test or backup UI is provided.

### Optional online model (API key)

Set `FRIDAY_MODE=online` and `OPENAI_API_KEY` in the server environment before launching. Set `FRIDAY_MODEL` if desired (default `gpt-4o-mini`). Obtain the key directly from the provider; never send it in chat or commit it to the repository. The key stays in the server process environment and is not sent to the browser or saved to SQLite. Environment variables can still be exposed to privileged local users or processes; this is not an encrypted credential vault. Online requests send the latest conversation messages to OpenAI, may incur charges, and require outbound access to `api.openai.com`. This Arena sandbox restricts that host, so actual cloud inference has not been verified here. The UI reports **key configured**, not provider connectivity or key validity. Errors do not expose the provider response or credential.

Mode is selected explicitly at server startup; there is no automatic cloud fallback, hybrid routing, agent key management, or tool access. Connecting a model key is not equivalent to connecting an autonomous agent.

```sh
export FRIDAY_MODE=online
# Set OPENAI_API_KEY privately in your environment before launching.
python3 friday/server.py
```

## Architecture

```text
Owner browser (token in tab) ──same-origin HTTP──> local Python HTTP API
                                                   ├─ SQLite: messages, memories, audit
                                                   ├─ Ollama adapter ──loopback──> locally installed model (offline)
                                                   └─ OpenAI adapter ──HTTPS──> cloud model (online, opt-in)
Future: policy/approval gateway → scoped tools; bounded orchestrator → specialists;
        retrieval/index → owner-approved memory; cloud adapters → explicit opt-in
```

The current API has no command execution, remote tools or autonomous action agents. Task specialists are model prompts in a fixed two-call draft/review workflow, not independent processes or access to tools. Both calls use the same configured model; review is not independent fact verification. Runs require an available model, may cost money in online mode, and produce drafts only. A failed run is marked failed; interrupted runs are marked failed on restart. The owner explicitly marks tasks done. `model_chat()` dispatches to the Ollama or OpenAI adapter; this is not yet a generic provider interface. Browser input and model output are untrusted; UI renders text via `textContent`, never as HTML. Conversation includes recent messages but not documents or tool output. This is not a complete prompt-injection defense; never grant model output authority to perform actions.

### Actual SQLite schema

- `messages(id PK, role, content, created_at)` — recent history sent to the local model.
- `memories(id PK, category, content, source, confidence, created_at, updated_at)` — explicit owner entries; confidence 1.0 denotes owner assertion, not verified truth.
- `audit(id PK, action, detail, created_at)` — memory changes, task events and successful model responses.
- `tasks(id PK, title, status, agent, draft, review, created_at, updated_at)` — owner-created tasks and model-generated drafts; no actions are executed.

Future migrations should add schema versioning, provenance and expiry, explicit embeddings/indexes, tasks, agents, tool grants, approvals, immutable audit and backup metadata. SQLite-to-PostgreSQL migration needs an explicit migration layer, not an assumed drop-in.

## Security and permissions design

Current: random shared bearer token, loopback default, parameterized SQL, bounded request body, no shell/tool execution, no implicit memory writes, CSP and no-store responses. The UI itself is public at the local endpoint, but all data APIs require the token. Threat boundaries: browser → API; owner text → model; model → display. Session tokens, memory and chat are sensitive. XSS, malicious browser extensions, compromised host/model server, local malware, and anyone obtaining the token remain threats. No encryption at rest, session expiry, rate limiting, credential vault, authorization roles, CSRF-origin checks, audit integrity, or security audit is implemented. Do not claim zero-trust security.

Future policy: tools deny by default; grants scoped by tool/resource/action/expiry and agent, never inherited automatically. Low-risk authorized reads can run within grants; medium writes need scoped approval; high-risk external sends, spending, deletion, publishing, access and security changes require fresh, specific owner approval immediately before execution. Separate draft from execution; bind approval to exact action parameters, expiry, identity and single use. Audit request, decision and actual result. Treat external content as data, isolate it from instructions, and sandbox code with resource/network limits. These are **design requirements**, not enforced features.

## Roadmap and minimum viable FRIDAY

MVP implemented here: owner-controlled conversation history, opt-in keyword memory retrieval, tasks and tool-free specialist drafts, with local and opt-in cloud model adapters; no action capability. Real on-device model validation and tests under disconnected network conditions remain important next steps.

1. Phase 0–1: foundation here; strengthen authentication, migrations, complete export and restore testing.
2. Phase 2: model provider interface, routing, retrieval with provenance, planning and verification; evaluate measurable accuracy and latency.
3. Phase 3: bounded agents with explicit permissions, dependencies and audit; no inherited privileges.
4. Phase 4: capability registry, scoped grants, approvals, isolated execution and documented integrations.
5. Phase 5: opt-in voice/documents/vision with visible indicators and local alternatives.
6. Phase 6: test real offline operation with preinstalled models, indexing and recovery; secure optional sync.
7. Phase 7: threat model, independent security testing, encryption and recovery drills before any remote deployment.
8. Phase 8–9: transparent cancellable scheduling, feedback, performance and deployment hardening.

## Test

`python3 -m unittest discover -s friday/tests -v`. Tests use a temporary SQLite database and mocked model responses; they do not demonstrate real inference, network isolation, hardware, security penetration testing, agent execution or backup restoration. See test output for results. Tests mock both model providers.

### Results in this environment

- FRIDAY suite: **10 passed** (authentication, memory lifecycle and opt-in retrieval, mocked local/cloud model behavior, task workflow and failure handling).
- No real Ollama inference, actual process-restart test, full offline network-disconnection test, security audit, or backup restore was performed. The persistence tests reopen the database within the test process.
