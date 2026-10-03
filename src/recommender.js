import { CONTENT, INTERACTION_WEIGHTS } from "./data.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function createInitialState() {
  return {
    seeded: false,
    interactions: [],
    diversity: 30
  };
}

export function seedState(ids = []) {
  const now = Date.now();
  return {
    seeded: ids.length > 0,
    diversity: 30,
    interactions: ids.map((contentId, index) => ({
      contentId,
      type: "seed",
      at: now + index
    }))
  };
}

export function addInteraction(state, contentId, type) {
  if (!INTERACTION_WEIGHTS[type]) {
    throw new Error(`Tipo de interação inválido: ${type}`);
  }
  return {
    ...state,
    interactions: [
      ...state.interactions,
      { contentId, type, at: Date.now() }
    ]
  };
}

export function setDiversity(state, diversity) {
  return {
    ...state,
    diversity: clamp(Number(diversity) || 0, 0, 100)
  };
}

function getContent(contentId) {
  return CONTENT.find((item) => item.id === contentId);
}

function getConsumedContentIds(state) {
  return new Set(
    state.interactions
      .filter((interaction) => interaction.type !== "seed")
      .map((interaction) => interaction.contentId)
  );
}

export function inferProfile(state) {
  const featureWeights = new Map();
  const genreWeights = new Map();
  const positiveHistory = [];
  const total = Math.max(1, state.interactions.length);

  state.interactions.forEach((interaction, index) => {
    const item = getContent(interaction.contentId);
    if (!item) return;

    const base = INTERACTION_WEIGHTS[interaction.type] ?? 0;
    const recencyFactor = 0.85 + (0.3 * (index + 1)) / total;
    const weighted = base * recencyFactor;

    item.genres.forEach((genre) => {
      genreWeights.set(genre, (genreWeights.get(genre) || 0) + weighted);
      featureWeights.set(`genre:${genre}`, (featureWeights.get(`genre:${genre}`) || 0) + weighted);
    });

    item.tags.forEach((tag) => {
      const tagWeight = tag.startsWith("person:") ? 0.24 : 0.55;
      featureWeights.set(`tag:${tag}`, (featureWeights.get(`tag:${tag}`) || 0) + weighted * tagWeight);
    });

    if (weighted > 0) {
      positiveHistory.push({ item, weighted, index });
    }
  });

  const genres = [...genreWeights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  return {
    features: featureWeights,
    genres,
    positiveHistory
  };
}

function normalizeAffinity(value, maxPositive) {
  if (maxPositive <= 0) return 0;
  return clamp(value / maxPositive, -1, 1);
}

export function scoreContent(item, state, profile = inferProfile(state)) {
  const values = [...profile.features.values()];
  const maxPositive = Math.max(1, ...values.filter((value) => value > 0));

  const genreAffinities = item.genres.map((genre) =>
    normalizeAffinity(profile.features.get(`genre:${genre}`) || 0, maxPositive)
  );
  const tagAffinities = item.tags.map((tag) =>
    normalizeAffinity(profile.features.get(`tag:${tag}`) || 0, maxPositive)
  );

  const genreScore = genreAffinities.length
    ? genreAffinities.reduce((sum, value) => sum + value, 0) / genreAffinities.length
    : 0;
  const tagScore = tagAffinities.length
    ? tagAffinities.reduce((sum, value) => sum + value, 0) / tagAffinities.length
    : 0;

  const similarityBase = clamp(genreScore * 0.75 + tagScore * 0.25, -1, 1);
  const similarity = Math.max(0, similarityBase) * 58;
  const penalty = Math.abs(Math.min(0, similarityBase)) * 35;
  const popularity = (item.popularity / 100) * 20;

  const recentPositive = profile.positiveHistory.slice(-3);
  const recentMatches = recentPositive.reduce((sum, entry) => {
    const overlap = entry.item.genres.filter((genre) => item.genres.includes(genre)).length;
    return sum + (overlap > 0 ? 1 : 0);
  }, 0);
  const recency = recentPositive.length ? (recentMatches / recentPositive.length) * 12 : 0;

  const topGenres = new Set(profile.genres.filter((genre) => genre.value > 0).slice(0, 3).map((genre) => genre.name));
  const unknownGenres = item.genres.filter((genre) => !topGenres.has(genre)).length;
  const explorationBase = item.genres.length ? unknownGenres / item.genres.length : 0;
  const diversityFactor = clamp(state.diversity / 100, 0, 1);
  const exploration = explorationBase * (5 + 20 * diversityFactor);

  const watchedCount = state.interactions.filter((interaction) => interaction.contentId === item.id).length;
  const repetitionPenalty = Math.max(0, watchedCount - 1) * 3;
  const seedPenalty = state.interactions.some(
    (interaction) => interaction.contentId === item.id && interaction.type === "seed"
  ) ? 16 : 0;

  const personalizationMultiplier = 1 - diversityFactor * 0.28;
  const total = clamp(
    similarity * personalizationMultiplier + popularity + recency * personalizationMultiplier + exploration - penalty - repetitionPenalty - seedPenalty,
    0,
    100
  );

  return {
    total,
    similarity: similarity * personalizationMultiplier,
    popularity,
    recency: recency * personalizationMultiplier,
    exploration,
    penalty,
    repetitionPenalty,
    seedPenalty
  };
}

export function rankContent(state) {
  const profile = inferProfile(state);
  const consumedIds = getConsumedContentIds(state);
  const unseenContent = CONTENT.filter((item) => !consumedIds.has(item.id));
  const rankingPool = unseenContent.length ? unseenContent : CONTENT;

  return rankingPool.map((item) => ({
    item,
    score: scoreContent(item, state, profile)
  })).sort((a, b) => b.score.total - a.score.total);
}

export function getTopGenres(state, limit = 6) {
  const profile = inferProfile(state);
  return profile.genres.filter((genre) => genre.value > 0).slice(0, limit);
}

export function getPrimaryPositiveTitle(state) {
  const positiveTypes = new Set(["seed", "preview", "finish", "like", "love"]);
  const latest = [...state.interactions]
    .reverse()
    .find((interaction) => positiveTypes.has(interaction.type));
  return latest ? getContent(latest.contentId) : null;
}

export function getDiverseRecommendations(state, limit = 6) {
  const ranked = rankContent({ ...state, diversity: Math.max(70, state.diversity) });
  const chosen = [];
  const usedPrimaryGenres = new Set();

  for (const entry of ranked) {
    const primary = entry.item.genres[0];
    if (!usedPrimaryGenres.has(primary) || chosen.length >= Math.floor(limit * 0.7)) {
      chosen.push(entry);
      usedPrimaryGenres.add(primary);
    }
    if (chosen.length >= limit) break;
  }

  return chosen;
}

export function formatScore(value) {
  return Math.round(value);
}
