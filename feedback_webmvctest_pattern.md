---
name: WebMvcTest controller test pattern for tappy-pos
description: How to set up @WebMvcTest in tappy-pos backend — gotchas with TenantInterceptor, AuthContext ThreadLocal, and anyString() vs any() for nullable params
type: feedback
originSessionId: 2c28c009-17ce-4555-a25c-0df5dadea5ae
---
For @WebMvcTest in tappy-pos backend, always use this pattern:

**Why:** Path prefixes in TenantInterceptor use /api/auth but @WebMvcTest sends /auth, causing 400. AuthContext ThreadLocal leaks between tests. anyString() won't match null User-Agent from MockMvc.

**Required @Import:**
```java
@Import({SecurityConfig.class, JwtTokenProvider.class, AuthContext.class, FeatureContext.class,
         FeatureAccessAspect.class})  // FeatureAccessAspect only for @RequiresFeature controllers
@EnableAspectJAutoProxy              // needed for @RequiresFeature enforcement in the test slice
```

**Required @MockBean (always):**
- `TenantInterceptor tenantInterceptor` — mock preHandle to return true; avoids /api path prefix mismatch
- `SessionRegistry sessionRegistry` — stub isValid to return true
- `JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint` — write 401 body in doAnswer
- `MessageService messageService` — return key as message

**@MockBean NOT needed:** TenantRepository, TenantContext — these are only needed by the real TenantInterceptor

**@BeforeEach must do:**
1. `when(tenantInterceptor.preHandle(any(), any(), any())).thenReturn(true)`
2. For AuthControllerTest: `@Autowired AuthContext authContext` + `authContext.clear()` — JwtAuthenticationFilter only clears FeatureContext, not AuthContext, so ThreadLocal leaks between tests
3. Configure jwtAuthenticationEntryPoint.commence() to set status 401

**Token generation:** Use real JwtTokenProvider (injected via @Autowired) to generate signed JWTs. Set features claim + tid claim matching X-Tenant-ID header.

**Null User-Agent:** MockMvc doesn't set User-Agent header by default. Use `any()` (not `anyString()`) for IP/userAgent params in authService.authenticateUser() mocks.

**How to apply:** Every new controller test class should follow this pattern exactly.
