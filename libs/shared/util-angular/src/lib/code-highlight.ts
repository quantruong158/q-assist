declare const Prism: {
  languages: Record<string, unknown>;
  tokenize: (text: string, grammar: unknown) => (string | PrismToken)[];
};

export interface PrismToken {
  type: string;
  content: string | PrismToken | PrismToken[];
  alias?: string;
}

export const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  css: 'css',
  scss: 'css',
  html: 'markup',
  htm: 'markup',
  svg: 'markup',
  xml: 'markup',
  json: 'json',
  py: 'python',
  cs: 'csharp',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  sql: 'sql',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  vue: 'markup',
  svelte: 'markup',
  toml: 'toml',
  ini: 'ini',
  env: 'bash',
  gitignore: 'bash',
  dockerfile: 'docker',
  makefile: 'makefile',
};

export function getLanguageFromFileName(fileName: string): string | null {
  const parts = fileName.split('.');
  if (parts.length < 2) {
    const baseName = fileName.toLowerCase();
    if (baseName === 'dockerfile') return 'docker';
    if (baseName === 'makefile') return 'makefile';
    if (baseName.startsWith('.env')) return 'bash';
    if (baseName === 'gitignore') return 'bash';
    return null;
  }
  const ext = parts[parts.length - 1].toLowerCase();
  return LANGUAGE_MAP[ext] ?? null;
}

export function tokenizeLine(
  content: string,
  language: string | null,
): (string | PrismToken)[] | null {
  if (!language) return null;
  const grammar = Prism.languages[language];
  if (!grammar) return null;
  try {
    return Prism.tokenize(content, grammar);
  } catch {
    return null;
  }
}

export function isStringToken(token: string | PrismToken): token is string {
  return typeof token === 'string';
}

export function getTokenClass(token: PrismToken): string {
  if (token.alias) {
    return `${token.type} ${token.alias}`;
  }
  return token.type;
}

export function getTokenText(token: PrismToken): string {
  if (typeof token.content === 'string') {
    return token.content;
  }
  if (Array.isArray(token.content)) {
    return token.content.map((t) => (typeof t === 'string' ? t : getTokenText(t))).join('');
  }
  return '';
}
