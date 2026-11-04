/**
 * Confere se `pnpm-lock.yaml` está em sincronia com `package.json` — a mesma
 * checagem que faz o Docker build falhar com ERR_PNPM_OUTDATED_LOCKFILE.
 *
 * Uso: node backend/scripts/checar-lockfile.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(readFileSync(resolve(backend, 'package.json'), 'utf8'));
const lock = readFileSync(resolve(backend, 'pnpm-lock.yaml'), 'utf8');

/** Extrai os "specifiers" do importer "." (o único do projeto). */
function specifiersDoLock(texto) {
  const linhas = texto.split(/\r?\n/);
  const inicio = linhas.findIndex((l) => l.trim() === 'importers:');
  if (inicio === -1) throw new Error('lockfile sem seção "importers:"');

  const specifiers = { dependencies: {}, devDependencies: {} };
  let secao = null;
  let pacoteAtual = null;

  for (let i = inicio + 1; i < linhas.length; i += 1) {
    const linha = linhas[i];
    // Fim dos importers: qualquer chave de primeiro nível passa a ser vazio.
    if (/^\S/.test(linha) && linha.trim().endsWith(':')) break;

    if (/^    (dependencies|devDependencies):/.test(linha)) {
      secao = linha.trim().replace(':', '');
      pacoteAtual = null;
      continue;
    }
    if (/^ {6}\S/.test(linha) && secao) {
      pacoteAtual = linha.trim().replace(/:$/, '').replace(/^'|'$/g, '');
      continue;
    }
    const spec = /^ {8}specifier: (.+)$/.exec(linha);
    if (spec && secao && pacoteAtual) {
      specifiers[secao][pacoteAtual] = spec[1].trim();
    }
  }
  return specifiers;
}

const lockDeps = specifiersDoLock(lock);
const erros = [];

for (const secao of ['dependencies', 'devDependencies']) {
  const noPkg = pkg[secao] ?? {};
  const noLock = lockDeps[secao];

  for (const [nome, versao] of Object.entries(noPkg)) {
    if (!(nome in noLock)) {
      erros.push(`${secao}: ${nome}@${versao} está no package.json e falta no lockfile`);
    } else if (noLock[nome] !== versao) {
      erros.push(
        `${secao}: ${nome} — package.json pede "${versao}", lockfile tem "${noLock[nome]}"`,
      );
    }
  }
  for (const nome of Object.keys(noLock)) {
    if (!(nome in noPkg)) {
      erros.push(`${secao}: ${nome} está no lockfile e NÃO no package.json (é o que quebra o docker build)`);
    }
  }
}

// O snapshot do pacote precisa existir se ele está declarado.
for (const secao of ['dependencies', 'devDependencies']) {
  for (const nome of Object.keys(lockDeps[secao])) {
    const escape = nome.replace(/[/\\^$.*+?()[\]{}|]/g, '\\$&');
    const padrao = new RegExp(`^ {2}('?)${escape}@[^:]+\\1:`, 'm');
    if (!padrao.test(lock)) {
      erros.push(`${secao}: ${nome} não tem entrada "packages"/"snapshots" no lockfile`);
    }
  }
}

if (erros.length === 0) {
  const total =
    Object.keys(lockDeps.dependencies).length +
    Object.keys(lockDeps.devDependencies).length;
  console.log(`✅ lockfile em sincronia com package.json (${total} pacotes declarados)`);
  process.exit(0);
}

console.error('❌ lockfile DESATUALIZADO — o docker build vai falhar:\n');
for (const erro of erros) console.error('   - ' + erro);
console.error('\nCorrija com: cd backend && pnpm install');
process.exit(1);
