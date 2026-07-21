const ISO3_A_ISO2: Record<string, string> = {
  ECU: 'ec',
  COL: 'co',
  MEX: 'mx',
  ARG: 'ar',
  PER: 'pe',
  CHL: 'cl',
  VEN: 've',
  BOL: 'bo',
  PRY: 'py',
  URY: 'uy',
  BRA: 'br',
  PAN: 'pa',
  CRI: 'cr',
  GTM: 'gt',
  HND: 'hn',
  SLV: 'sv',
  NIC: 'ni',
  DOM: 'do',
  CUB: 'cu',
  USA: 'us',
  CAN: 'ca',
  ESP: 'es',
  FRA: 'fr',
  ITA: 'it',
  DEU: 'de',
  GBR: 'gb',
  PRT: 'pt',
  NLD: 'nl',
  JPN: 'jp',
  CHN: 'cn',
};

export function codigoIso2(codigo: string): string {
  const normalizado = codigo.trim().toUpperCase();
  if (normalizado.length === 2) return normalizado.toLowerCase();
  if (ISO3_A_ISO2[normalizado]) return ISO3_A_ISO2[normalizado];
  return normalizado.slice(0, 2).toLowerCase();
}

export function urlBandera(codigo: string, ancho = 80): string {
  return `https://flagcdn.com/w${ancho}/${codigoIso2(codigo)}.png`;
}

export function resolverUrlBandera(codigo: string, bandera?: string): string {
  const urlGuardada = bandera?.trim();
  if (urlGuardada?.startsWith('http')) {
    const iso2 = codigoIso2(codigo);
    if (urlGuardada.toLowerCase().includes(`/${iso2}.`)) return urlGuardada;
    const match = urlGuardada.match(/flagcdn\.com\/w\d+\/([a-z]{2,3})\.png/i);
    if (match && match[1].length > 2) return urlBandera(codigo, 80);
  }
  return urlBandera(codigo, 80);
}
