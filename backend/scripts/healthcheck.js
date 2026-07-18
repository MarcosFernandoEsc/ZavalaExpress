import { setTimeout as delay } from 'node:timers/promises';

const port = process.env.PORT || 3000;
const url = `http://127.0.0.1:${port}/health`;

async function main() {
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await response.text();

    if (!response.ok) {
      console.error(`Healthcheck falló: ${response.status} ${body}`);
      process.exit(1);
    }

    console.log(body);
  } catch (error) {
    console.error(`No se pudo contactar ${url}: ${error.message}`);
    process.exit(1);
  }
}

await main();
