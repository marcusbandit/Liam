# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Using Bun

This project uses [Bun](https://bun.sh) as the package manager and runtime.

### Installation

If you haven't installed Bun yet, install it:

```bash
curl -fsSL https://bun.sh/install | bash
```

### Setup

Install dependencies:

```bash
bun install
```

### Development

Start the development server:

```bash
bun run dev
```

### Build

Build for production:

```bash
bun run build
```

### Preview

Preview the production build:

```bash
bun run preview
```

### Lint

Run ESLint:

```bash
bun run lint
```

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
