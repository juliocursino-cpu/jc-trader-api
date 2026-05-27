const leagueMap = {
  "CHINA 1": "China Super League",
  "NORWAY 1": "Norway Eliteserien",
  "NORWAY 2": "Norway OBOS",
  "CZECH 1": "Czech First League",
  "SLOVAKIA 1": "Slovakia 1",
  "SPAIN 1": "Spain La Liga",
  "POLAND 1": "Poland Ekstraklasa",
  "BRAZIL 1": "Brazil Serie A",
  "BRAZIL 2": "Brazil Serie B",
  "ENGLAND 1": "England Premier League",
  "ITALY 1": "Italy Serie A",
  "GERMANY 1": "Germany Bundesliga",
  "FRANCE 1": "France Ligue 1",
  "SWEDEN 1": "Sweden Allsvenskan",
  "USA 1": "USA Major League Soccer",
  "CHILE1": "Chile Primera Division",
  "IRELAND 1": "Republic of Ireland Premier Division",
  "IRELAND 2": "Republic of Ireland First Division",
  "SWEDEN 2": " Sweden Superettan",
  "UKRAINE 1": "Ukraine Premier League", 
  "NETHERLANDS 1": "Netherlands Eredivisie",
  "SPAIN 2": "Spain La Liga 2",
  "ESTONIA 1": "Estonia Meistriliiga",
  "ROMANIA 1": "Romania Liga 1",
  "ITALY 3": "Italy Serie C",
  "PARAGUAY 1": "Paraguay Division 1",
  "BULGARIA 1": "Bulgaria First League",
  "AUSTRIA 1": "Austria Admiral Bundesliga",
  "GREECE 1": "Greece Super League",
  "QATAR 1": "Qatar Q League",
  "EGYPT 1": "Egypt Premier League",
  "ITALY 2": "Italy Serie B",
  "CHILE 1": "Chile Primera Division",
  "ESTONIA 2": "Estonia Esiliiga A",
  "CHINA 1": "China PR Super League",
};

export function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const n = Number(String(value).replace("%", "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeKey(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function normalizeGame(game = {}) {
  const rawLeague = game.League || game.league || game.liga || "";
  const leagueKey = String(rawLeague).toUpperCase().trim();

  return {
    ...game,

    id: game.ID_Evento || game.id || game.id_original || `${game.Home}-${game.Away}-${game.Date}`,

    Date: String(game.Date || game.date || game.data || "").slice(0, 10),
    Time: String(game.Time || game.time || game.hora || "00:00").slice(0, 5),

    League: leagueMap[leagueKey] || rawLeague,

    Home: game.Home || game.home || game.time_casa || "",
    Away: game.Away || game.away || game.time_fora || "",

    Goals_H_HT: toNumber(game.Goals_H_HT || game.gols_ht_casa),
    Goals_A_HT: toNumber(game.Goals_A_HT || game.gols_ht_fora),
    Goals_H_FT: toNumber(game.Goals_H_FT || game.gols_ft_casa),
    Goals_A_FT: toNumber(game.Goals_A_FT || game.gols_ft_fora),

    Odd_H_Back: toNumber(game.Odd_H_Back || game.odd_casa),
    Odd_D_Back: toNumber(game.Odd_D_Back || game.odd_empate),
    Odd_A_Back: toNumber(game.Odd_A_Back || game.odd_fora),

    Odd_Over05HT: toNumber(
      game.Odd_Over05_HT_Back ||
        game.Odd_Over05HT ||
        game.odd_over_05_ht
    ),

    Odd_Over15FT: toNumber(
      game.Odd_Over15_FT_Back ||
        game.Odd_Over15FT ||
        game.odd_over_15_ft
    ),

LeagueKey: normalizeKey(
  game.liga_normalizada ||
    game.League ||
    game.league ||
    game.liga
),

HomeKey: normalizeKey(
  game.time_casa_normalizado ||
    game.Home ||
    game.home ||
    game.time_casa
),

AwayKey: normalizeKey(
  game.time_fora_normalizado ||
    game.Away ||
    game.away ||
    game.time_fora
),

    Odd_CS_0x1_Lay: toNumber(game.Odd_CS_0x1_Lay),
    Odd_CS_1x0_Lay: toNumber(game.Odd_CS_1x0_Lay),
    Odd_CS_Goleada_H_Lay: toNumber(game.Odd_CS_Goleada_H_Lay),
    Odd_CS_Goleada_A_Lay: toNumber(game.Odd_CS_Goleada_A_Lay),
  };
}