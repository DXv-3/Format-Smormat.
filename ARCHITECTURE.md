# FORMAT-SMORMAT — SYSTEM ARCHITECTURE
## "FUCK YOUR FORMAT"

> *Anything in, anything out, via one brain.*  
> *We never get ready; we are always already ready.*

---

## Security Boundary (Non-Negotiable)

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER / FRONTEND                                         │
│  React 18 + Zustand (irGraph hot cache)                     │
│  NO API KEYS. EVER. Sends WorkerRequest only.               │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api  (WorkerRequest)
                     │
┌────────────────────▼────────────────────────────────────────┐
│  CLOUDFLARE WORKER  (worker/src/index.ts)                   │
│  • CORS enforcement (ALLOWED_ORIGINS)                       │
│  • IP rate limiting (30 req/min)                            │
│  • Payload size gate (10 MB)                                │
│  • Prompt templating (server-side only)                     │
│  • Output sanitization (strip leaked keys)                  │
│  • GEMINI_API_KEY injected from CF secrets — never returned │
└────────────────────┬────────────────────────────────────────┘
                     │
              Gemini API / Future models
```

---

## The IR Brain

Everything ingested becomes nodes and edges in the `IRGraph`.  
Files are one manifestation. Agents, org charts, metaphors — all the same primitives.

```
IRNode   — entity (document, agent, org_unit, concept, metaphor_cell…)
IREdge   — relationship (contains, references, depends_on, analogous_to…)
IRView   — projection of IR through a lens (file, agent, knowledge, metaphor)
IREvent  — append-only event log (InputIngested → ParsedToIR → … → ViewsPrepared)
```

---

## Always-Ready Intake Pipeline

```
File / Paste / API Event
        │
        ▼
[1] InputIngested          ← local parse (Mammoth/PDF.js/Turndown/JSZip)
        │
        ▼
[2] ParsedToIR             ← IRNode created, content payload set
        │
        ▼
[3] RelationsDiscovered    ← Worker metadata → entities → IREdges
        │
        ▼
[4] ViewsPrepared          ← suggested actions surface in UI
        │
        ▼
[5] ActionRequested        ← user triggers transform / lens / export
        │
        ▼
[6] ActionCompleted        ← IRView upserted, artifact available
```

---

## Lens System

| Lens | Output |
|------|--------|
| `file` | Markdown, PDF, DOCX, HTML |
| `agent` | Multi-agent YAML/JSON workflow |
| `knowledge` | Knowledge graph JSON |
| `metaphor_biology` | Organism analogy + mapping table |
| `metaphor_city` | Urban infrastructure analogy |
| `metaphor_swarm` | Swarm intelligence analogy |
| `metaphor_orchestra` | Orchestral arrangement analogy |

Multiple views coexist for the same IR. Switching lenses never re-ingests.

---

## File Layout

```
types.ts                    ← canonical IR types (IRNode, IREdge, IRView, IREvent, IRGraph)
worker/src/index.ts         ← hardened CF Worker (sole LLM gateway)
services/ingestPipeline.ts  ← always-ready intake pipeline
src/stores/useFileStore.ts  ← Zustand IR hot cache
components/                 ← React UI (IR-aware)
lib/format-router/          ← format routing + view dispatch
```

---

## Worker Modes

| Mode | Model | Purpose |
|------|-------|---------|
| `metadata` | Flash (light) | Classify, extract entities, generate tags |
| `transform` | Pro (heavy) | Execute actions (second brain, insights, LLM prompt, custom) |
| `lens_render` | Pro (heavy) | Render through a specific lens |
| `ir_enrich` | Flash (light) | Future: graph-context-aware enrichment |

---

## Execution Chain Protocol

For every new feature:
1. **Analyze constraints** — zero-trust, IR-first, event-driven
2. **Plan** — enumerate files, data flow through IR and events
3. **Execute** — production-ready code only
4. **Reflect** — how does this improve always-ready behavior?
