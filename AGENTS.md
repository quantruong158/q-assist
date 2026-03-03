# AGENTS.md - Coding Agent Instructions

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

This is a dermatology AI chat assistant built with Angular 21.1, GenKit, and Firebase.

## Build/Lint/Test Commands

```bash
# Development
pnpm start                    # Start dev server (ng serve)
pnpm run build                # Production build
pnpm run watch                # Development build with watch mode

# Linting & Formatting
pnpm run lint                 # Run ESLint (Angular ESLint + TypeScript ESLint)
# Prettier is configured in package.json and should be run via IDE or git hooks

# Testing (Vitest)
pnpm test                     # Run all tests in watch mode
pnpm test -- --run            # Run all tests once (CI mode)
pnpm test -- app.spec.ts      # Run a single test file
pnpm test -- --grep "should create"  # Run tests matching a specific pattern

# SSR & Mobile
pnpm run serve:ssr:angular-chat-template  # Serve SSR build
pnpm run build:mobile         # Build for Capacitor/Mobile
```

## Project Structure

```
src/
├── app/
│   ├── app.ts               # Root component
│   ├── app.html             # Root template
│   ├── app.scss             # Root styles
│   ├── app.spec.ts          # Root component tests
│   ├── app.config.ts        # Browser app config
│   ├── app.routes.ts        # Client routes
│   ├── core/                # Singleton services, interceptors, tokens
│   ├── shared/              # Reusable UI components, pipes, directives
│   └── features/            # Feature modules (lazy loaded)
├── main.ts                  # Browser bootstrap
├── server.ts                # Express SSR server
├── styles.scss              # Global styles (Tailwind or Material overrides)
└── index.html               # HTML shell
```

## Code Style Guidelines

### Formatting & naming
- **Prettier:** Follow strict formatting (100 char width, single quotes, 2 spaces).
- **Components:** PascalCase (e.g., `ChatDialog`).
- **Files:** kebab-case (e.g., `chat-dialog.ts`, `chat-dialog.html`).
- **Selectors:** `app-` prefix + kebab-case (e.g., `app-chat-dialog`).
- **Signals:** camelCase (e.g., `isLoading`, `userMessage`).
- **Services:** PascalCase + `Service` suffix (e.g., `ChatService`).

### TypeScript
- **Strict Mode:** strict null checks, no implicit any.
- **Types:** Explicitly define return types for public methods. Avoid `any`; use `unknown` if needed.
- **Modifiers:**
  - Use `readonly` for immutable properties.
  - Use `protected` for members accessed only in the template.
  - Use `private` for internal logic.

### Imports
Order imports to reduce merge conflicts:
1.  Angular Core (`@angular/core`)
2.  Angular Modules (`@angular/common`, `@angular/router`)
3.  Third-party libraries (`rxjs`, `firebase`)
4.  Local app imports (`../../services`, `./component`)

## Angular Best Practices

### Components
- **Standalone:** All components are standalone by default in v21. Do NOT add `standalone: true`.
- **Change Detection:** Always use `ChangeDetectionStrategy.OnPush`.
- **Inputs/Outputs:** Use signal-based `input()` and `output()` functions, NOT decorators.
- **Dependency Injection:** Use `inject()` instead of constructor injection.

```typescript
@Component({
  selector: 'app-example',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './example.html',
  styleUrl: './example.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Example {
  // Inputs & Outputs
  readonly title = input.required<string>();
  readonly submitted = output<void>();

  // State (Signals)
  protected readonly isLoading = signal(false);
  protected readonly count = signal(0);
  
  // Derived State
  protected readonly doubleCount = computed(() => this.count() * 2);

  // Services
  private readonly apiService = inject(ApiService);
}
```

### Templates
- **Control Flow:** Use `@if`, `@for`, `@switch` (new syntax) instead of `*ngIf`/`*ngFor`.
- **Bindings:**
  - Use `[class.active]="isActive()"` over `ngClass`.
  - Use `[style.width.px]="width()"` over `ngStyle`.
- **Images:** Use `NgOptimizedImage` (`ngSrc`) for static assets.
- **Async:** Use `async` pipe or signals for observables.

```html
@if (isLoading()) {
  <app-spinner />
} @else {
  <div class="content" [class.highlight]="isHighlighed()">
    @for (item of items(); track item.id) {
      <app-card [data]="item" (click)="select(item)" />
    }
  </div>
}
```

### State Management
- **Signals:** Use `signal()` for local state.
- **Updates:** Use `update(val => ...)` or `set(val)`—never mutate arrays/objects in place.
- **Derived:** Use `computed()` for values derived from other signals.
- **Effects:** Use `effect()` sparingly, primarily for logging or syncing with external APIs.

### Services & HTTP
- **Singleton:** Use `@Injectable({ providedIn: 'root' })`.
- **HTTP:** Use `HttpClient` with Observables, but expose data to components as Signals where appropriate (e.g., `toSignal`).

## Testing (Vitest)
- **Framework:** Vitest + Angular TestBed.
- **Pattern:** `describe` -> `beforeEach` (compile) -> `it` (assertions).
- **Selectors:** Use `By.css` or component harnesses.

```typescript
describe('Example', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Example],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(Example);
    fixture.componentRef.setInput('title', 'Test');
    fixture.detectChanges();
    
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test');
  });
});
```

## Accessibility (a11y)
- **Standards:** MUST meet WCAG AA requirements.
- **Tools:** Code must pass AXE checks.
- **Focus:** Manage focus during navigation and dialog open/close.
- **Contrast:** Ensure 4.5:1 contrast ratio.
- **Semantic HTML:** Use native `<button>`, `<input>` etc., or proper ARIA roles.

## Error Handling
- Use `try/catch` in async functions.
- Handle HTTP errors in services or interceptors.
- Display user-friendly error messages (snackbars/toasts) rather than failing silently.
