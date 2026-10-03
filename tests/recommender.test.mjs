import test from "node:test";
import assert from "node:assert/strict";
import { CONTENT } from "../src/data.js";
import {
  addInteraction,
  getTopGenres,
  rankContent,
  scoreContent,
  seedState,
  setDiversity
} from "../src/recommender.js";

const byId = (id) => CONTENT.find((item) => item.id === id);

test("cold start esportivo infere Esporte entre os principais gêneros", () => {
  const state = seedState(["senna", "drive-to-survive", "beckham"]);
  const genres = getTopGenres(state, 3).map((genre) => genre.name);
  assert.ok(genres.includes("Esporte"));
});

test("sinal negativo reduz score de conteúdo de romance", () => {
  let state = seedState(["senna", "drive-to-survive", "beckham"]);
  const bridgerton = byId("bridgerton");
  const before = scoreContent(bridgerton, state).total;
  state = addInteraction(state, "bridgerton", "dislike");
  const after = scoreContent(bridgerton, state).total;
  assert.ok(after < before);
});

test("interações esportivas elevam títulos esportivos no ranking", () => {
  let state = seedState(["senna", "drive-to-survive", "beckham"]);
  state = addInteraction(state, "senna", "love");
  state = addInteraction(state, "drive-to-survive", "finish");
  const topFive = rankContent(state).slice(0, 5).map(({ item }) => item.id);
  assert.ok(topFive.some((id) => ["beckham", "last-dance"].includes(id)));
});

test("título que recebe novo sinal sai do ranking e dá lugar a outro conteúdo", () => {
  let state = seedState(["lizzie-mcguire", "a-cinderella-story", "younger"]);
  const firstRecommendation = rankContent(state)[0].item.id;

  state = addInteraction(state, firstRecommendation, "finish");
  const nextRanking = rankContent(state);

  assert.ok(!nextRanking.some(({ item }) => item.id === firstRecommendation));
  assert.notEqual(nextRanking[0].item.id, firstRecommendation);
});

test("controle de diversidade é limitado entre 0 e 100", () => {
  let state = seedState(["senna"]);
  state = setDiversity(state, 150);
  assert.equal(state.diversity, 100);
  state = setDiversity(state, -30);
  assert.equal(state.diversity, 0);
});
