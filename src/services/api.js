const API_BASE =
  import.meta.env.DEV
    ? "http://localhost:3001/api"
    : "https://jc-trader-api.onrender.com/api";

export async function fetchTodayGames() {
  const response = await fetch(`${API_BASE}/jogos-janela/betfair`);

  if (!response.ok) {
    throw new Error("Erro ao carregar jogos.");
  }

  return response.json();
}

export async function fetchMatches() {
  const response = await fetch(`${API_BASE}/matches?limit=50000`);

  if (!response.ok) {
    throw new Error("Erro ao carregar banco.");
  }

  return response.json();
}

export async function fetchFutureMatches() {
  const response = await fetch(`${API_BASE}/matches-futuros?dias=2`);

  if (!response.ok) {
    throw new Error("Erro ao carregar jogos do banco.");
  }

  return response.json();
}

export async function fetchHistoricalMatches() {
  const response = await fetch(`${API_BASE}/matches-historico`);

  if (!response.ok) {
    throw new Error("Erro ao carregar histórico do banco.");
  }

  return response.json();
}