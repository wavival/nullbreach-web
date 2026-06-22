# Components & Hooks

Inventory of reusable building blocks under `src/components/` and `src/hooks/`. Page-level components in `src/pages/` are not listed here — they're route handlers, not reusable.

shadcn/ui is the conceptual baseline (`components.json` configured) but most UI primitives are hand-rolled in this repo; only `@radix-ui/react-slot` is pulled directly.

## Table of contents

- [UI primitives](#ui-primitives--srccomponentsui)
  - [Button](#button)
  - [Badge](#badge)
  - [Card](#card)
  - [Input](#input)
  - [InlineError](#inlineerror)
  - [Markdown](#markdown)
  - [Toast / ToastViewport](#toast--toastviewport)
  - [WhatsAppButton](#whatsappbutton)
- [Layout](#layout--srccomponentslayout)
  - [Layout](#layout-1)
  - [Navbar, Sidebar, Footer](#navbar-sidebar-footer)
  - [ProtectedRoute](#protectedroute)
- [ErrorBoundary](#errorboundary--srccomponentserrorboundarytsx)
- [Hooks](#hooks--srchooks)
- [Adding a new component](#adding-a-new-component)

## UI primitives — `src/components/ui/`

### `Button`

`src/components/ui/button.tsx` — forwardRef wrapper around `<button>`. Variant styles in `button.variants.ts` via `class-variance-authority`.

| Prop      | Type                                                       | Default  | Notes                                     |
| --------- | ---------------------------------------------------------- | -------- | ----------------------------------------- |
| `variant` | `primary` \| `secondary` \| `tertiary` \| `outlined` \| `ghost` | `primary` |                                           |
| `size`    | `sm` \| `md` \| `lg` \| `icon`                              | `md`     | `icon` = 40×40 square                     |
| `asChild` | `boolean`                                                  | `false`  | Uses Radix `Slot` to render the child tag |
| `...`     | `React.ButtonHTMLAttributes<HTMLButtonElement>`             |          | Standard button props pass through        |

```tsx
<Button variant="primary" size="lg" onClick={handleSubmit}>Save</Button>
<Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
```

### `Badge`

`src/components/ui/badge.tsx` (+ `badge.variants.ts`). Static pill / chip.

| Prop      | Variants                                                                 | Default   |
| --------- | ------------------------------------------------------------------------ | --------- |
| `variant` | `primary`, `secondary`, `tertiary`, `neutral`, `outline`, `success`, `warning`, `error`, `info` | `neutral` |
| `size`    | `sm`, `md`, `lg`                                                         | `md`      |

### `Card`

`src/components/ui/card.tsx` — basic surface container (uses `surface-alt`).

### `Input`

`src/components/ui/input.tsx` — styled `<input>` wrapper.

### `InlineError`

`src/components/ui/InlineError.tsx` — inline error banner with optional retry button.

| Prop        | Type           | Required | Notes                                |
| ----------- | -------------- | -------- | ------------------------------------ |
| `message`   | `string`       | Yes      | Error text                           |
| `onRetry`   | `() => void`   | No       | Renders a "Reintentar" trailing link |
| `className` | `string`       | No       |                                      |

Has `role="alert"` for screen readers. Animates in via `animate-slide-down`.

### `Markdown`

`src/components/ui/markdown.tsx` — `react-markdown` + `remark-gfm` with the dark-prose Tailwind classes wired in. Custom `code` renderer detects fenced blocks and delegates to `CodeBlock` (clipboard-copy enabled). Links open in a new tab with `rel="noreferrer noopener"`.

| Component   | Prop       | Type     | Notes                                |
| ----------- | ---------- | -------- | ------------------------------------ |
| `Markdown`  | `children` | `string` | Raw markdown                         |
| `Markdown`  | `className`| `string` | Appended to the `prose` wrapper      |
| `CodeBlock` | `code`     | `string` | Exported standalone                  |
| `CodeBlock` | `lang`     | `string` | Optional language label              |

### `Toast` / `ToastViewport`

`src/components/ui/Toast.tsx` — thin wrapper around `react-hot-toast`'s `Toaster`. Mounted once at the App root. Position: `top-right`, gutter 8px. Use the `toast` helper from `@/lib/toast` to push notifications.

### `WhatsAppButton`

`src/components/ui/WhatsAppButton.tsx` — fixed bottom-right floating WhatsApp link. URL configurable via `VITE_WHATSAPP_URL`. Mounted globally in `App.tsx`.

## Layout — `src/components/layout/`

### `Layout`

Outlet wrapper that composes `Navbar` + `Sidebar` + `Footer` around routed pages.

### `Navbar`, `Sidebar`, `Footer`

Top bar, persistent side navigation (280px wide per `spacing.sidebar`), and footer with `VITE_AUTHOR_NAME` / `VITE_AUTHOR_URL` attribution.

### `ProtectedRoute`

`src/components/layout/ProtectedRoute.tsx` — auth gate. Reads `useAuth().token`. Shows a centered spinner while `isLoading`; redirects to `/login` with `state.from = location.pathname` when unauthenticated.

```tsx
<Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
```

## ErrorBoundary — `src/components/ErrorBoundary.tsx`

Class component (React requires it). Renders a centered fallback with reload button. In `DEV`, shows the raw `error.message` inside a `<pre>`. Production observability hook in `componentDidCatch` is a TODO — wire Sentry or alternative there.

| Prop       | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| `children` | `ReactNode` |                                  |
| `fallback` | `ReactNode` | Optional custom error UI         |

Mounted at the application root inside `src/main.tsx`.

## Hooks — `src/hooks/`

| Hook             | Signature                                              | What it does                                                                                  |
| ---------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `useAuth`        | `() => AuthContextValue`                               | Reads the `AuthContext`. Throws if used outside `AuthProvider`.                               |
| `useError`       | `() => UseErrorReturn`                                 | Toast helpers: `showError`, `showSuccess`, `showWarning`, `showApiError(err, override?)`.     |
| `useMediaQuery`  | `(query: string) => boolean`                           | SSR-safe wrapper around `matchMedia` with change-event subscription.                          |
| `useFocusTrap`   | `<T extends HTMLElement>(active?: boolean) => Ref<T>`  | Cycles Tab/Shift+Tab inside the ref'd container; restores focus on unmount.                   |
| `usePageTitle`   | `(title: string) => void`                              | Sets `document.title` to `${title} · NullBreach` for the component's lifetime.                |

`useError.showApiError` accepts an optional `Partial<Record<number, string>>` to override the toast text per HTTP status code.

## Adding a new component

1. UI primitive → `src/components/ui/<Name>.tsx`. Use `cn` (`@/lib/utils`) for class merging and follow the variants pattern (`<Name>.variants.ts` + `cva`) when there are more than two style flavors.
2. Layout / page-shape → `src/components/layout/`.
3. Co-locate the test as `<Name>.test.tsx` (Vitest + Testing Library). MSW handlers in `src/test/handlers.ts`; override per-suite with `server.use(...)`.
4. Export from the file directly — no barrel files; the `@/components/...` alias path is the public API.
