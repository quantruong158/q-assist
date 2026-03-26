# AGENTS.md - Q-Assist Development Guide

## Project Overview

This is an Nx monorepo with Angular 21 for the web app and Firebase Cloud Functions. The project uses TailwindCSS v4, sharded via spartan-ng/helm components, and signals for state management.

## Build/Lint/Test Commands

All commands use `npx nx <target> <project>` via Nx for consistency.

### Development
```bash
npx nx serve web-app                              # Start dev server
npx nx build web-app --watch --configuration development  # Watch mode
```

### Build
```bash
npx nx build web-app                              # Production build
```

### Testing
```bash
npx nx test web-app                               # Run all tests
npx nx test web-app --testFile=path/to/file.spec.ts  # Single test file

# Run tests for a specific lib:
npx nx vitest finance-ui
npx nx vitest chat-ui

# Run with coverage:
npx nx vitest finance-ui --coverage
```

### Linting
```bash
npx nx lint web-app                               # Lint web-app
npx nx lint <project>                            # Lint specific project
```

### Firebase
```bash
npx firebase emulators:start --import .firebase/emu-data --export-on-exit .firebase/emu-data
```

## Code Style Guidelines

### TypeScript
- **Strict mode enabled** - noImplicitAny, strictNullChecks, etc.
- Avoid `any` - use `unknown` when type is uncertain
- Prefer type inference when obvious
- Use Zod for runtime validation
- Use `input.required<T>()` and `input<T>()` for component inputs
- Use `output<T>()` for component outputs

### Angular Components (v21+)
- Standalone components are the default - do NOT set `standalone: true`
- Use `ChangeDetectionStrategy.OnPush` on all components
- Use signals (`signal()`, `computed()`, `linkedSignal()`) for state
- Use `inject()` function instead of constructor injection for dependencies
- Use native control flow: `@if`, `@for`, `@switch` (NOT `*ngIf`, `*ngFor`, `*ngSwitch`)
- Do NOT use `ngClass` - use `class` bindings instead
- Do NOT use `ngStyle` - use `style` bindings instead
- Do NOT use `@HostBinding`/`@HostListener` - use `host` object in decorator
- Use `provideIcons()` in component providers for icon imports
- Keep components small and focused

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ChatMessageItem` |
| Selectors | kebab-case | `chat-message` |
| Files | kebab-case | `message-list.ts` |
| Directives | PascalCase | `HlmIconDirective` |
| Services | PascalCase | `AuthService` |
| Variables | camelCase | `isLoading`, `userName` |
| Constants | SCREAMING_SNAKE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `TransactionWithSource` |

### Import Organization
1. Angular core imports
2. Angular library imports (@angular/*, @ng-icons/*)
3. Third-party imports (npm packages)
4. Internal app imports (@qos/*, @spartan-ng/helm/*)
5. Relative imports

### Formatting
- **Prettier** handles formatting (see `.prettierrc`)
- Single quotes in TypeScript
- 2 space indentation
- 100 character line width
- Trailing commas in multi-line
- Semicolons required
- EditorConfig enforced (see `.editorconfig`)

### File Structure
```
apps/
  web-app/          # Main Angular application
  functions/        # Firebase Cloud Functions (Genkit AI)
libs/
  chat/             # Chat feature domain
    ui/              # UI components
    data-access/     # Services/state
    shared-models/  # TypeScript models
    feat-chat/      # Feature components
  finance/          # Finance feature domain
    ui/
    data-access/
    shared-models/
    feat-dashboard/
  shared/           # Shared across domains
    ui/             # shartan-ng components
    auth/           # Authentication
    data-access/    # Global state
    models/         # Global models
    util-angular/   # Angular utilities
    util-hardware/   # Hardware utilities
```

### Path Aliases
```typescript
@import '@spartan-ng/helm/button';     // UI components
@import '@qos/chat/data-access';       // Internal libs
@import '@qos/shared/auth/util';
```

### Error Handling
- Use try/catch with proper typing
- Handle errors in services, surface user-friendly messages
- Use Zod schemas for API response validation
- Firebase errors should be caught and translated to user messages

### Accessibility
- Must pass AXE checks
- WCAG AA compliance required
- Proper ARIA attributes
- Focus management
- Color contrast compliance

### Styling
- **TailwindCSS v4** for styling (imported in `tailwind.css`)
- Custom theme with `--font-sans` override
- Dark mode via `.dark-theme` class
- SCSS for complex component styles (Angular component `styleUrl`)
- Use `clsx` and `tailwind-merge` for conditional classes

### Testing Patterns
```typescript
// Angular components with TestBed
import { TestBed } from '@angular/core/testing';
import { MyComponent } from './my-component';

describe('MyComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(MyComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

// Vitest for non-Angular TypeScript
import { describe, it, expect } from 'vitest';
```

## Project Configuration

### ESLint
- Uses flat config (`eslint.config.mjs`)
- Nx ESLint plugin for module boundary enforcement
- Angular ESLint for Angular-specific rules

### TypeScript
- Base config: `tsconfig.base.json`
- App config extends base with strict options
- Path aliases defined in base config

### Prettier
- Single quotes: true
- Print width: 100
- HTML files use Angular parser

### Environment
- Environment files: `apps/web-app/src/environments/`
- `environment.ts` - development
- `environment.prod.ts` - production

## State Management

- **Signals** for local component state
- **computed()** for derived state (never use mutate(), use set() or update())
- Services with `providedIn: 'root'` for singleton state
- Firebase Firestore for persistent data
- Keep state transformations pure and predictable

## Templates

- Keep templates simple - avoid complex logic
- Do NOT write arrow functions in templates
- Use paths relative to component TS file when using external templates
