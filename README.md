# bash-env

A simulated bash environment with an in-memor (pluggable) virtual filesystem, written in TypeScript.

Designed for agents exploring a filesystem with a "full" but secure bash tool.

## Installation

```bash
pnpm install
```

## Usage

### Programmatic API

```typescript
import { BashEnv } from "./src/BashEnv.js";

// Default layout: starts in /home/user with /bin, /tmp
const env = new BashEnv();
await env.exec('echo "Hello" > greeting.txt');
const result = await env.exec("cat greeting.txt");
console.log(result.stdout); // "Hello\n"

// Custom files: starts in / with only specified files
const custom = new BashEnv({
  files: { "/data/file.txt": "content" },
});
await custom.exec("cat /data/file.txt");
```

### Interactive Shell

```bash
pnpm shell
```

## Supported Commands

`basename`, `cat`, `cd`, `cp`, `cut`, `dirname`, `echo`, `env`, `find`, `grep`, `head`, `ls`, `mkdir`, `mv`, `printenv`, `pwd`, `rm`, `sed`, `sort`, `tail`, `tee`, `touch`, `tr`, `true`, `false`, `uniq`, `wc`, `xargs`

All commands support `--help` for usage information.

## Shell Features

- Pipes: `cmd1 | cmd2`
- Redirections: `>`, `>>`, `2>`, `2>&1`, `<`
- Command chaining: `&&`, `||`, `;`
- Variables: `$VAR`, `${VAR}`, `${VAR:-default}`
- Positional parameters: `$1`, `$2`, `$@`, `$#`
- Glob patterns: `*`, `?`, `[...]`
- If statements: `if COND; then CMD; elif COND; then CMD; else CMD; fi`
- Functions: `function name { ... }` or `name() { ... }`

## Default Layout

When created without options, BashEnv provides a Unix-like directory structure:

- `/home/user` - Default working directory (and `$HOME`)
- `/bin` - Contains stubs for all built-in commands
- `/usr/bin` - Additional binary directory
- `/tmp` - Temporary files directory

Commands can be invoked by path (e.g., `/bin/ls`) or by name.

## Development

```bash
pnpm test        # Run tests in watch mode
pnpm test:run    # Run tests once
pnpm build       # Build TypeScript
```

## License

ISC
