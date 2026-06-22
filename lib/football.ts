// Adapter for football-data.org (free tier). Competition "WC" = current World Cup.
// Docs: https://www.football-data.org/documentation/quickstart
// Only used by the daily cron to pull real scores; swap this file to change provider.

export type ApiResult = {
  apiId: number;
  utcDate: string; // ISO
  finished: boolean;
  homeCode: string | null;
  awayCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z]/g, ""); // keep letters only
}

// Maps normalized provider names -> our FIFA codes. Includes common aliases.
const NAME_TO_CODE: Record<string, string> = {};
function alias(code: string, ...names: string[]) {
  for (const n of names) NAME_TO_CODE[normalize(n)] = code;
}
alias("ALG", "Algeria");
alias("ARG", "Argentina");
alias("AUS", "Australia");
alias("AUT", "Austria");
alias("BEL", "Belgium");
alias("BIH", "Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia-Herzegovina");
alias("BRA", "Brazil");
alias("CAN", "Canada");
alias("CPV", "Cape Verde", "Cabo Verde");
alias("COL", "Colombia");
alias("CRO", "Croatia");
alias("CUW", "Curacao", "Curaçao");
alias("CZE", "Czech Republic", "Czechia");
alias("COD", "DR Congo", "Congo DR", "Democratic Republic of Congo", "Congo Democratic Republic");
alias("ECU", "Ecuador");
alias("EGY", "Egypt");
alias("ENG", "England");
alias("FRA", "France");
alias("GER", "Germany");
alias("GHA", "Ghana");
alias("HAI", "Haiti");
alias("IRN", "Iran", "IR Iran");
alias("IRQ", "Iraq");
alias("CIV", "Ivory Coast", "Cote d'Ivoire", "Côte d'Ivoire");
alias("JPN", "Japan");
alias("JOR", "Jordan");
alias("MEX", "Mexico");
alias("MAR", "Morocco");
alias("NED", "Netherlands");
alias("NZL", "New Zealand");
alias("NOR", "Norway");
alias("PAN", "Panama");
alias("PAR", "Paraguay");
alias("POR", "Portugal");
alias("QAT", "Qatar");
alias("KSA", "Saudi Arabia");
alias("SCO", "Scotland");
alias("SEN", "Senegal");
alias("RSA", "South Africa");
alias("KOR", "South Korea", "Korea Republic", "Republic of Korea");
alias("ESP", "Spain");
alias("SWE", "Sweden");
alias("SUI", "Switzerland");
alias("TUN", "Tunisia");
alias("TUR", "Turkey", "Türkiye", "Turkiye");
alias("USA", "United States", "USA", "United States of America");
alias("URU", "Uruguay");
alias("UZB", "Uzbekistan");

export function codeForName(name: string | undefined | null): string | null {
  if (!name) return null;
  return NAME_TO_CODE[normalize(name)] ?? null;
}

// Fetch World Cup matches in [dateFrom, dateTo] (YYYY-MM-DD). Returns [] if no key.
export async function fetchResults(dateFrom: string, dateTo: string): Promise<ApiResult[]> {
  const key = process.env.FOOTBALL_API_KEY;
  if (!key) return [];
  const url = `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const res = await fetch(url, {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { matches?: any[] };
  const out: ApiResult[] = [];
  for (const m of data.matches ?? []) {
    out.push({
      apiId: m.id,
      utcDate: m.utcDate,
      finished: m.status === "FINISHED",
      homeCode: codeForName(m.homeTeam?.name),
      awayCode: codeForName(m.awayTeam?.name),
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
    });
  }
  return out;
}
