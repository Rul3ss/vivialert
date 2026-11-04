/**
 * Gera `src/airports/airports.data.ts` a partir da base aberta do OurAirports
 * (https://ourairports.com/data/ — domínio público, atualizada toda semana).
 *
 *   node scripts/generate-airports.mjs            # baixa o CSV
 *   node scripts/generate-airports.mjs arquivo.csv # usa um CSV já baixado
 *
 * Só entram aeroportos brasileiros com código IATA e voo regular. Aeroportos
 * internacionais continuam aceitos na API por digitação do código, mas não
 * aparecem na sugestão — se um dia isso incomodar, é aqui que se amplia.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_CSV = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const DESTINO = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'airports',
  'airports.data.ts',
);

/** Parser CSV mínimo (RFC 4180: aspas, vírgula entre aspas e quebra de linha). */
function linhas(csv) {
  const saida = [];
  let campo = '';
  let linha = [];
  let dentroDeAspas = false;

  for (let i = 0; i < csv.length; i += 1) {
    const caractere = csv[i];

    if (dentroDeAspas) {
      if (caractere === '"' && csv[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else if (caractere === '"') {
        dentroDeAspas = false;
      } else {
        campo += caractere;
      }
      continue;
    }

    if (caractere === '"') {
      dentroDeAspas = true;
    } else if (caractere === ',') {
      linha.push(campo);
      campo = '';
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && csv[i + 1] === '\n') i += 1;
      linha.push(campo);
      saida.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += caractere;
    }
  }

  if (campo.length > 0 || linha.length > 0) {
    linha.push(campo);
    saida.push(linha);
  }
  return saida;
}

function ehVooRegular(linha) {
  return linha.scheduled_service === 'yes';
}

async function main() {
  const entrada = process.argv[2];
  const csv = entrada ? await readFile(entrada, 'utf8') : await baixar();

  const [cabecalho, ...dados] = linhas(csv);
  const coluna = (nome) => {
    const indice = cabecalho.indexOf(nome);
    if (indice === -1) throw new Error(`Coluna ausente no CSV: ${nome}`);
    return indice;
  };

  const cIata = coluna('iata_code');
  const cPais = coluna('iso_country');
  const cRegiao = coluna('iso_region');
  const cCidade = coluna('municipality');
  const cNome = coluna('name');
  const cRegular = coluna('scheduled_service');

  const porIata = new Map();
  for (const linha of dados) {
    if (linha.length < cabecalho.length) continue;
    const registro = {
      iso_country: linha[cPais],
      iso_region: linha[cRegiao],
      municipality: linha[cCidade],
      name: linha[cNome],
      scheduled_service: linha[cRegular],
      iata_code: linha[cIata],
    };

    if (registro.iso_country !== 'BR') continue;
    if (!registro.iata_code) continue;
    if (!ehVooRegular(registro)) continue;

    const iata = registro.iata_code.toUpperCase();
    // A base tem casos duplicados (aeroporto e heliporto com o mesmo IATA):
    // o primeiro — que vem ordenado por tamanho do aeroporto — fica.
    if (!porIata.has(iata)) {
      porIata.set(iata, {
        iata,
        city: (registro.municipality || registro.name).trim(),
        name: registro.name,
        state: (registro.iso_region.split('-')[1] ?? '').toUpperCase(),
      });
    }
  }

  const aeroportos = [...porIata.values()].sort((a, b) =>
    a.iata.localeCompare(b.iata),
  );
  if (aeroportos.length < 50) {
    throw new Error(
      `Só ${aeroportos.length} aeroportos encontrados — o filtro provavelmente mudou.`,
    );
  }

  await escrever(aeroportos);
  console.log(`${aeroportos.length} aeroportos gravados em ${DESTINO}`);
}

async function baixar() {
  const resposta = await fetch(URL_CSV);
  if (!resposta.ok) {
    throw new Error(`Falha ao baixar o CSV: HTTP ${resposta.status}`);
  }
  return resposta.text();
}

async function escrever(aeroportos) {
  const corpo = aeroportos
    .map(
      ({ iata, city, name, state }) =>
        `  { iata: ${JSON.stringify(iata)}, city: ${JSON.stringify(city)}, ` +
        `name: ${JSON.stringify(name)}, state: ${JSON.stringify(state)} },`,
    )
    .join('\n');

  const conteudo = `// Gerado por scripts/generate-airports.mjs — não edite à mão.
// Fonte: OurAirports (https://ourairports.com/data/), domínio público.
// Filtro: iso_country=BR, iata_code preenchido, scheduled_service=yes.
// Aeroportos fora desta lista continuam aceitos na API digitando o código IATA.
// Gerado em ${new Date().toISOString().slice(0, 10)}.

export interface AirportRecord {
  /** Código IATA de 3 letras, sempre em caixa alta. */
  iata: string;
  city: string;
  name: string;
  /** Sigla do estado (UF). */
  state: string;
}

export const AIRPORTS: readonly AirportRecord[] = [
${corpo}
];
`;

  await writeFile(DESTINO, conteudo, 'utf8');
}

await main();
