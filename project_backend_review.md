---
name: tappypos-backend-review-findings
description: Backend code review findings from May 2026 — which areas pass and which have hardcoded string issues
metadata: 
  node_type: memory
  type: project
  originSessionId: 5b11564b-48b9-4959-96ab-03075ae1afff
---

Backend code review completed May 2026. Overall quality is high.

**PASS:**
- @Autowired: None — all classes use constructor injection via @RequiredArgsConstructor
- Entity exposure: All controllers return DTOs
- @RequiresFeature completeness: All business endpoints gated; public/stub controllers (AppVersion, Legal, Subscription, Auth, UtilitiesController) intentionally exempt
- Activity logging: ~40 logAsync calls, all major mutating operations covered
- Async patterns: All @Async methods pass tenantId explicitly, have try-finally with TenantContext.clear(), and carry @Transactional(propagation = NOT_SUPPORTED) where needed
- TenantContext leaks: All callers use try-finally pattern correctly
- Flyway migrations: Sequential V001–V008, no gaps
- Business logic in controllers: Clean — controllers delegate to services

**ISSUES — Hardcoded user-facing strings (not using MessageService): FIXED 2026-05-21**

All 5 backend B4 violations resolved:
- `AppointmentServiceImpl` — 5 strings → `error.appointment.*` keys
- `AuthService` — 2 activity log strings → `activity.login`, `activity.logout` keys  
- `GoldPriceServiceImpl` — 3 strings → `error.goldprice.*` keys
- `OnboardingController` — success + exception messages → `success.shop.created`, `error.shop.provision.failed`
- `MultiTenantController` — 2 activity log strings → `activity.tenant.created`, `activity.tenant.updated`

All new keys added to both `messages.properties` (EN) and `messages_vi.properties` (VI).

**Why:** All user-facing error strings must go through `MessageService` (→ `messages.properties` / `messages_vi.properties`) for i18n support.

**How to apply:** When adding new user-facing strings in Spring services/controllers, always use `messageService.getMessage("error.xxx")` or `messageService.getMessage("success.xxx")` and add corresponding keys to both message files.

---

**`current_tenant_id()` in repository queries — updated rule (2026-05-21)**

`TenantRlsAspect` sets `app.current_tenant` once at `@Transactional` start. Methods that call `setCurrentTenant()` mid-transaction still see NULL in the DB session for that transaction. This originally affected `RoleFeatureRepository` — now fixed with explicit `tenantId` bind param.

**Rule (refined):** `*TenantScoped` repository methods that use `current_tenant_id()` are safe and correct as long as they are only called from contexts where tenant context is already established (i.e., after `TenantRlsAspect` has run). `UserRepository.*TenantScoped` methods fall into this category — they are never called from no-tenant paths.

**Auth login path is safe because:**
- Login without `X-Tenant-ID` uses `findByUsernameGlobal()` — this query explicitly bypasses RLS via `ORDER BY tenant_id NULLS LAST LIMIT 1` with no `current_tenant_id()` filter at all.
- Usernames (phone numbers) are globally unique across all tenants, so the global lookup always returns the correct user.
- `findByUsernameTenantScoped()` and similar `*TenantScoped` methods are only invoked after tenant context is established (e.g. from within tenant-scoped service calls, or PIN login which sends `X-Tenant-ID`).

**No open violation in UserRepository.** The `RoleFeatureRepository` fix is the only case that needed explicit `tenantId` binding.

**How to apply:** When adding new repository queries called from auth/onboarding paths that run BEFORE tenant context is set, use explicit `tenantId` bind parameters or a global bypass method. Never add `current_tenant_id()` to queries that may run without tenant context.
