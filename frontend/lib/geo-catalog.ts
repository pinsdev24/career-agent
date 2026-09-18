/** ISO countries + scoped cities for Cut 3 typeaheads. */

export type CountryOption = {
  code: string;
  names: { en: string; fr: string; nl: string };
  aliases: string[];
  cities: string[];
};

export const COUNTRIES: CountryOption[] = [
  { code: "BE", names: { en: "Belgium", fr: "Belgique", nl: "België" }, aliases: ["belgie", "belgien"], cities: ["Brussels", "Ghent", "Antwerp", "Liège", "Leuven", "Bruges", "Namur", "Charleroi"] },
  { code: "NL", names: { en: "Netherlands", fr: "Pays-Bas", nl: "Nederland" }, aliases: ["holland"], cities: ["Amsterdam", "Rotterdam", "Utrecht", "Eindhoven", "The Hague"] },
  { code: "LU", names: { en: "Luxembourg", fr: "Luxembourg", nl: "Luxemburg" }, aliases: ["letzebuerg"], cities: ["Luxembourg"] },
  { code: "FR", names: { en: "France", fr: "France", nl: "Frankrijk" }, aliases: [], cities: ["Paris", "Lyon", "Lille", "Marseille", "Toulouse", "Nantes", "Bordeaux"] },
  { code: "DE", names: { en: "Germany", fr: "Allemagne", nl: "Duitsland" }, aliases: ["deutschland"], cities: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Düsseldorf"] },
  { code: "GB", names: { en: "United Kingdom", fr: "Royaume-Uni", nl: "Verenigd Koninkrijk" }, aliases: ["uk", "britain", "england"], cities: ["London", "Manchester", "Edinburgh"] },
  { code: "IE", names: { en: "Ireland", fr: "Irlande", nl: "Ierland" }, aliases: ["eire"], cities: ["Dublin", "Cork"] },
  { code: "ES", names: { en: "Spain", fr: "Espagne", nl: "Spanje" }, aliases: ["espana"], cities: ["Madrid", "Barcelona"] },
  { code: "IT", names: { en: "Italy", fr: "Italie", nl: "Italië" }, aliases: ["italia"], cities: ["Rome", "Milan"] },
  { code: "PT", names: { en: "Portugal", fr: "Portugal", nl: "Portugal" }, aliases: [], cities: ["Lisbon", "Porto"] },
  { code: "CH", names: { en: "Switzerland", fr: "Suisse", nl: "Zwitserland" }, aliases: ["schweiz"], cities: ["Zurich", "Geneva"] },
  { code: "AT", names: { en: "Austria", fr: "Autriche", nl: "Oostenrijk" }, aliases: [], cities: ["Vienna"] },
  { code: "SE", names: { en: "Sweden", fr: "Suède", nl: "Zweden" }, aliases: ["sverige"], cities: ["Stockholm"] },
  { code: "NO", names: { en: "Norway", fr: "Norvège", nl: "Noorwegen" }, aliases: ["norge"], cities: ["Oslo"] },
  { code: "DK", names: { en: "Denmark", fr: "Danemark", nl: "Denemarken" }, aliases: ["danmark"], cities: ["Copenhagen"] },
  { code: "FI", names: { en: "Finland", fr: "Finlande", nl: "Finland" }, aliases: ["suomi"], cities: ["Helsinki"] },
  { code: "PL", names: { en: "Poland", fr: "Pologne", nl: "Polen" }, aliases: ["polska"], cities: ["Warsaw"] },
  { code: "CZ", names: { en: "Czechia", fr: "Tchéquie", nl: "Tsjechië" }, aliases: ["czech republic"], cities: ["Prague"] },
  { code: "US", names: { en: "United States", fr: "États-Unis", nl: "Verenigde Staten" }, aliases: ["usa", "america"], cities: ["New York", "San Francisco", "Seattle", "Austin", "Boston", "Chicago"] },
  { code: "CA", names: { en: "Canada", fr: "Canada", nl: "Canada" }, aliases: [], cities: ["Toronto", "Montreal", "Vancouver"] },
  { code: "AR", names: { en: "Argentina", fr: "Argentine", nl: "Argentinië" }, aliases: [], cities: ["Buenos Aires"] },
  { code: "BR", names: { en: "Brazil", fr: "Brésil", nl: "Brazilië" }, aliases: ["brasil"], cities: ["São Paulo"] },
  { code: "AU", names: { en: "Australia", fr: "Australie", nl: "Australië" }, aliases: [], cities: ["Sydney", "Melbourne"] },
  { code: "SG", names: { en: "Singapore", fr: "Singapour", nl: "Singapore" }, aliases: [], cities: ["Singapore"] },
  { code: "IN", names: { en: "India", fr: "Inde", nl: "India" }, aliases: [], cities: ["Bengaluru", "Hyderabad", "Mumbai"] },
  { code: "AE", names: { en: "United Arab Emirates", fr: "Émirats arabes unis", nl: "Verenigde Arabische Emiraten" }, aliases: ["uae"], cities: ["Dubai", "Abu Dhabi"] },
  { code: "IL", names: { en: "Israel", fr: "Israël", nl: "Israël" }, aliases: [], cities: ["Tel Aviv"] },
  { code: "JP", names: { en: "Japan", fr: "Japon", nl: "Japan" }, aliases: [], cities: ["Tokyo"] },
  { code: "KR", names: { en: "South Korea", fr: "Corée du Sud", nl: "Zuid-Korea" }, aliases: ["korea"], cities: ["Seoul"] },
  { code: "ZA", names: { en: "South Africa", fr: "Afrique du Sud", nl: "Zuid-Afrika" }, aliases: [], cities: ["Cape Town"] },
];

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const CONTRACT_TYPES = [
  "permanent",
  "freelance",
  "internship",
  "fixed_term",
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const ROLE_SUGGESTIONS = [
  "AI Engineer",
  "Software Engineer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Data Engineer",
  "Firmware Engineer",
  "Embedded Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "Product Manager",
  "eng",
  "data",
  "embedded",
] as const;

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function countryLabel(code: string, locale: string): string {
  const row = COUNTRIES.find((c) => c.code === code);
  if (!row) return code;
  if (locale.startsWith("fr")) return row.names.fr;
  if (locale.startsWith("nl")) return row.names.nl;
  return row.names.en;
}

export function searchCountries(query: string, locale: string): CountryOption[] {
  const q = fold(query);
  if (!q) return COUNTRIES;
  return COUNTRIES.filter((c) => {
    const hay = [c.code, c.names.en, c.names.fr, c.names.nl, ...c.aliases]
      .map(fold)
      .join(" ");
    return hay.includes(q);
  });
}

export function citiesForCountries(codes: string[]): string[] {
  const set = new Set(codes.map((c) => c.toUpperCase()));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const country of COUNTRIES) {
    if (!set.has(country.code)) continue;
    for (const city of country.cities) {
      const key = city.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(city);
    }
  }
  return out;
}

export function searchCities(query: string, codes: string[]): string[] {
  const cities = citiesForCountries(codes);
  const q = fold(query);
  if (!q) return cities;
  return cities.filter((city) => fold(city).includes(q));
}
