CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  hora TIME,
  liga TEXT NOT NULL,
  liga_normalizada TEXT,
  time_casa TEXT NOT NULL,
  time_fora TEXT NOT NULL,
  time_casa_normalizado TEXT,
  time_fora_normalizado TEXT,
  gols_ht_casa INTEGER,
  gols_ht_fora INTEGER,
  gols_ft_casa INTEGER,
  gols_ft_fora INTEGER,
  odd_casa NUMERIC(10,2),
  odd_empate NUMERIC(10,2),
  odd_fora NUMERIC(10,2),
  odd_over_05_ht NUMERIC(10,2),
  odd_over_15_ft NUMERIC(10,2),
  odd_over_25_ft NUMERIC(10,2),
  odd_under_25_ft NUMERIC(10,2),
  minutos_gols JSONB,
  id_original TEXT,
  fonte TEXT DEFAULT 'FootStats',
  resultado_ht TEXT,
  resultado_ft TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (id_original, fonte)
);

CREATE TABLE IF NOT EXISTS league_aliases (
  id SERIAL PRIMARY KEY,
  nome_original TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS team_aliases (
  id SERIAL PRIMARY KEY,
  nome_original TEXT NOT NULL,
  nome_normalizado TEXT NOT NULL,
  liga_normalizada TEXT,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS import_logs (
  id SERIAL PRIMARY KEY,
  fonte TEXT,
  liga TEXT,
  periodo_inicio DATE,
  periodo_fim DATE,
  total_recebidos INTEGER DEFAULT 0,
  total_inseridos INTEGER DEFAULT 0,
  total_atualizados INTEGER DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);