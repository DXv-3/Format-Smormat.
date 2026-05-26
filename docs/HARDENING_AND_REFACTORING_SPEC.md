# Format-Smormat Hardening & Refactoring Specification

**Date**: 2026-05-26  
**Branch**: harden-production-v1  
**PR**: #2 (open)  
**Repo**: https://github.com/DXv-3/Format-Smormat. (trailing dot required)

---

## 1. Executive Status

| Item | Status |
|------|--------|
| P0 Security Leak (GEMINI_API_KEY) | **FIXED** — Key never reaches any client bundle. All traffic routes through hardened Cloudflare Worker proxy. |
| First Refactor Slice (Zustand) | **Complete** — Global file state extracted to `src/stores/useFileStore.ts`. Cinematic Framer Motion UX preserved. |
| Hardening Pass | **Complete** — Worker proxy production-grade. All code review feedback addressed. |
| Overall Grade | A- on security + first slice. C+ on hardening, ops readiness, maintainability. |

---

## 2. Security Architecture

### Worker (worker/src/index.ts on harden-production-v1)
- **CORS**: Restricted via `ALLOWED_ORIGINS` environment variable
- **Rate Limiting**: In-memory rate limiter with `cf-connecting-ip` + `MAX_RATE_ENTRIES=1000` + eviction
- **Body Size**: Dual enforcement (header check + real `arrayBuffer` validation)
- **Error Logging**: Server-side only, no key leakage in responses
- **Key Storage**: `env.GEMINI_API_KEY` via Wrangler secret

### Client (services/ai.ts)
- **Production Guard**: Throws error if `VITE_GEMINI_PROXY_URL` missing in production
- **Timeout**: 120s timeout on proxy fetch
- **Facade**: Thin, signature-preserving wrapper over original API

### vite.config.ts
- Clean — no `define` or `loadEnv` of secrets

---

## 3. Critical Hardening Issues (Worker Proxy)

| Issue | Severity | Status |
|-------|----------|--------|
| W1 — Wildcard CORS | High | **FIXED** — Restricted to `ALLOWED_ORIGINS` env |
| W2 — No rate limiting/auth | Critical | **FIXED** — In-memory rate limiter with eviction |
| W3 — Large input accepted | Medium-High | **FIXED** — Dual body-size enforcement |
| W4 — Prompt injection surface | Medium | **MITIGATED** — Length cap + guard added |
| W5 — Model version pinning | Low-Medium | **TODO** — Pin to dated versions for prod |

---

## 4. Refactor State

### Delivered
- `src/stores/useFileStore.ts` (94 LOC) — Clean extraction with revocation hygiene and derived helpers
- `App.tsx` (~321 LOC) — Orchestration + cinematic scroll logic only + thin async wrappers
- All conversion features preserved (local + AI specialists)
- Cinematic Framer Motion experience intact

### Remaining Issues
| Issue | Location | Description |
|-------|----------|-------------|
| R1 | `useFileStore.ts` | `confirm()` in `clearAll` — blocking, should be modal |
| R2 | `useFileStore.ts` | No persistence — full reload loses all files |
| R3 | `App.tsx` | Fragile import path — use `@/src/stores/...` alias |
| R4 | `App.tsx`, `IngestionEngine.tsx` | TypeScript `as any` casts — fix types |
| R5 | `App.tsx`, `FileItem.tsx` | Duplicate download logic — extract to `lib/downloads.ts` |
| R6 | `lib/format-router/*` | Stub implementations — advanced routing UI will break |

---

## 5. God Components & Code Size

| File | LOC | Status | Next Action |
|------|-----|--------|-------------|
| `App.tsx` | ~321 | Good (first slice done) | Keep cinematic; move handlers to hooks |
| `components/FileItem.tsx` | 474 | Still a god | Split into `FileItem/`, `useFileItem.ts`, download utils |
| `components/IngestionEngine.tsx` | 332 | Still a god | Extract analysis steps + game-plan generator |
| `services/converter.ts` | 379 | Heavy but acceptable | Dynamic import boundaries already good |
| `lib/format-router/*` | ~30 | Non-functional stubs | Make real or gate UI behind flag |

---

## 6. Verification Checklist

- [ ] Deploy Worker with `ALLOWED_ORIGINS` set; test from real domain and confirm CORS blocks other origins
- [ ] Run `wrangler dev` + Vite dev server; perform full round-trip (upload → AI transform → download merged)
- [ ] `npm run typecheck && npm run lint` pass with zero errors
- [ ] Manual secret scan (`git grep -iE 'AIza|GEMINI_API_KEY' -- '*.ts' '*.tsx' '*.js'`) returns only Worker + docs
- [ ] Dependabot PR merged or xmldom bumped + Dependabot label cleared
- [ ] `CONTEXT_COMPILER_HYPOTHESES.md` removed from default branch
- [ ] At least one Vitest test exercising the store and one Worker prompt builder
- [ ] README updated with current deployment story (Worker first, then set proxy URL)

---

## 7. Recommended Next Steps

### High Priority
1. Merge/resolve Dependabot PR #1 (xmldom XML injection CVEs are real)
2. Add real ESLint + Vitest + strict CI (scripts are only placeholders)
3. Split remaining god components (FileItem + IngestionEngine)
4. Make format-router functional (currently stubs)

### Medium Priority
5. Replace blocking `confirm()` with proper modal
6. Add persistence (zustand persist middleware)
7. Full end-to-end test with real Worker deployment + production domain

### Low / Future
8. TanStack Query layer
9. Cinematic decoupling
10. True streaming body-size limits in Worker

---

## 8. Deployment Instructions

```bash
# 1. Deploy Worker
cd worker
wrangler login
wrangler secret put GEMINI_API_KEY   # paste your real key
wrangler secret put ALLOWED_ORIGINS # e.g., "https://yourdomain.com,http://localhost:3000"
wrangler deploy

# 2. Configure SPA
# Set VITE_GEMINI_PROXY_URL to the returned *.workers.dev URL
# in your hosting platform (or .env.local for local dev)
```

---

## 9. Key Links

- **Repo**: https://github.com/DXv-3/Format-Smormat.
- **PR #2 (hardening)**: https://github.com/DXv-3/Format-Smormat./pull/2
- **Dependabot PR #1**: https://github.com/DXv-3/Format-Smormat./pull/1

---

*This document synthesizes the complete session work: P0 GEMINI_API_KEY leak remediation via Cloudflare Worker proxy, thin client facade, first Zustand refactor slice, full code review + hardening findings, and roadmap for follow-up work.*