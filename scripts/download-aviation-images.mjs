import { createWriteStream } from 'fs';
import { mkdir, readFile, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'images');

const IMAGES = {
  'dashboard-hero.jpg': 'photo-1436491865332-7a61a109cc05',
  'staff-control.jpg': 'photo-1677924656040-703debadc2f8',
  'staff-vuelos.jpg': 'photo-1774995842354-a87e489f45f3',
  'staff-aeropuertos.jpg': 'photo-1775641732346-a7c0aed8aa62',
  'staff-aeronaves.jpg': 'photo-1627618712837-4f854fd64f20',
  'staff-tripulacion.jpg': 'photo-1764547168017-5ad7741ebdd5',
  'staff-asignaciones.jpg': 'photo-1761358244635-b46c56f810d0',
  'staff-escalas.jpg': 'photo-1739841463753-0768ddb1d2cb',
  'staff-tipos-avion.jpg': 'photo-1612182835983-d5fe85cfc888',
  'staff-aerolineas.jpg': 'photo-1761358244635-b46c56f810d0',
  'staff-paises.jpg': 'photo-1516738901171-8eb4fc13bd20',
  'staff-ciudades.jpg': 'photo-1761359920550-0c7d132893a6',
  'staff-terminales.jpg': 'photo-1764943430407-25a6ecd5c620',
  'staff-puertas.jpg': 'photo-1775641732346-a7c0aed8aa62',
  'cliente-vuelos.jpg': 'photo-1436491865332-7a61a109cc05',
  'cliente-reservas.jpg': 'photo-1586441133374-ed1cb4007a47',
  'cliente-pasajeros.jpg': 'photo-1761588839157-6e301a6ba0de',
  'staff-facturas.jpg': 'photo-1731686602391-7484df33a03c',
  'staff-pagos.jpg': 'photo-1556742031-c6961e8560b0',
  'staff-metodos-pago.jpg': 'photo-1673837552444-7a90431588fe',
  'staff-checkins.jpg': 'photo-1751842838748-88f4f5d08837',
  'staff-asientos.jpg': 'photo-1529990131237-cfa5ce9517b6',
  'staff-tarifas.jpg': 'photo-1725258080098-727051947997',
  'staff-servicios.jpg': 'photo-1558828514-2b140e975af2',
  'staff-reserva-servicios.jpg': 'photo-1596226004757-09d33a19ea5d',
  'staff-equipajes.jpg': 'photo-1762965119363-af950b523dca',
  'staff-notificaciones.jpg': 'photo-1761872752747-de8cb8b69a63',
};

function download(url) {
  return new Promise((resolve, reject) => {
    const request = (target) => {
      https
        .get(target, { headers: { 'User-Agent': 'Avianco-Project/1.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode} for ${target}`));
            return;
          }
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    };
    request(url);
  });
}

function isJpeg(buffer) {
  return buffer.length > 1000 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

await mkdir(outDir, { recursive: true });

let ok = 0;
let fail = 0;

for (const [filename, photoId] of Object.entries(IMAGES)) {
  const url = `https://images.unsplash.com/${photoId}?w=1200&q=85&auto=format&fit=crop`;
  const dest = join(outDir, filename);
  try {
    const buffer = await download(url);
    if (!isJpeg(buffer)) {
      throw new Error(`No es JPEG válido (${buffer.length} bytes)`);
    }
    await import('fs/promises').then(({ writeFile }) => writeFile(dest, buffer));
    const size = (await stat(dest)).size;
    console.log(`OK  ${filename} (${Math.round(size / 1024)} KB) <- ${photoId}`);
    ok++;
  } catch (err) {
    console.error(`FAIL ${filename}: ${err.message}`);
    fail++;
  }
}

console.log(`\nResultado: ${ok} OK, ${fail} fallos`);
process.exit(fail > 0 ? 1 : 0);
