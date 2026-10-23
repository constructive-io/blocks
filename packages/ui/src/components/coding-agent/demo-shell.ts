import type { FileChange, TerminalLine } from './harness';

/** What the demo shell can see: the session's files and changes, and where it runs. */
type TerminalContext = { files: Record<string, string>; changes: FileChange[]; path: string; branch: string };

/** A few read-only commands the demo shell answers from the session's own state; anything else is declined. */
export function demoShell(command: string, context: TerminalContext): Pick<TerminalLine, 'kind' | 'text'>[] {
	const [name, ...args] = command.trim().split(/\s+/);
	const out = (text: string) => ({ kind: 'output' as const, text });
	switch (name) {
		case 'pwd':
			return [out(context.path)];
		case 'ls': {
			const dir = (args[0] ?? '').replace(/\/$/, '');
			const prefix = dir ? `${dir}/` : '';
			const entries = new Set<string>();
			for (const path of Object.keys(context.files)) {
				if (!path.startsWith(prefix)) continue;
				const [head, ...rest] = path.slice(prefix.length).split('/');
				entries.add(rest.length ? `${head}/` : head);
			}
			return entries.size ? [out([...entries].sort().join('  '))] : [{ kind: 'error', text: `ls: ${dir}: No such file or directory` }];
		}
		case 'cat': {
			const file = context.files[args[0] ?? ''];
			return file === undefined ? [{ kind: 'error', text: `cat: ${args[0] ?? ''}: No such file or directory` }] : file.replace(/\n$/, '').split('\n').map(out);
		}
		case 'git':
			if (args[0] === 'status') {
				if (context.changes.length === 0) return [out(`On branch ${context.branch}`), out('nothing to commit, working tree clean')];
				return [
					out(`On branch ${context.branch}`),
					out('Changes not staged for commit:'),
					...context.changes.map((change) => out(`  ${change.before === null ? 'new file:' : 'modified:'}   ${change.path}`))
				];
			}
			if (args[0] === 'diff' && args[1] === '--stat') {
				return context.changes.map((change) => out(` ${change.path} | ${change.additions + change.deletions} ${'+'.repeat(Math.min(change.additions, 20))}${'-'.repeat(Math.min(change.deletions, 20))}`));
			}
			if (args[0] === 'branch') return [out(`* ${context.branch}`)];
			break;
		case 'echo':
			return [out(args.join(' '))];
		case 'help':
			return [out('This preview shell answers: pwd, ls [dir], cat <file>, git status, git diff --stat, git branch, echo, clear')];
	}
	return [{ kind: 'error', text: `${name}: not available in the preview shell. Type help for what is.` }];
}
