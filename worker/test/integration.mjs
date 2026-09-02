import assert from "node:assert/strict";

const apiBaseUrl = String(process.env.API_BASE_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:4173";
const visitorA = "11111111-1111-4111-8111-111111111111";
const visitorB = "22222222-2222-4222-8222-222222222222";

async function api(path, options = {}) {
  return fetch(`${apiBaseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(options.headers || {}),
    },
    ...options,
  });
}

const healthResponse = await api("/health");
assert.equal(healthResponse.status, 200);
assert.equal((await healthResponse.json()).status, "ok");

const preflightResponse = await api("/ideas", { method: "OPTIONS" });
assert.equal(preflightResponse.status, 204);
assert.equal(preflightResponse.headers.get("access-control-allow-origin"), origin);

const initialResponse = await api("/ideas", { headers: { "X-Visitor-Id": visitorA } });
assert.equal(initialResponse.status, 200);
const initialIdeas = (await initialResponse.json()).ideas;
assert.ok(initialIdeas.length >= 9);

const invalidResponse = await api("/ideas", {
  method: "POST",
  body: JSON.stringify({ content: "   " }),
});
assert.equal(invalidResponse.status, 400);

const marker = `公开评论集成测试 ${Date.now()}：帮我整理每天的学习计划。`;
const createResponse = await api("/ideas", {
  method: "POST",
  body: JSON.stringify({ content: marker }),
});
assert.equal(createResponse.status, 201);
const created = (await createResponse.json()).idea;
assert.equal(created.content, marker);
assert.equal(created.category, "效率工具");

const visitorBListResponse = await api("/ideas", { headers: { "X-Visitor-Id": visitorB } });
const visitorBList = (await visitorBListResponse.json()).ideas;
assert.ok(visitorBList.some((idea) => idea.id === created.id));

const likeResponse = await api(`/ideas/${created.id}/like`, {
  method: "PATCH",
  headers: { "X-Visitor-Id": visitorB },
  body: JSON.stringify({ liked: true }),
});
assert.equal(likeResponse.status, 200);
const likedIdea = (await likeResponse.json()).idea;
assert.equal(likedIdea.likes, 1);
assert.equal(likedIdea.liked, true);

const duplicateLikeResponse = await api(`/ideas/${created.id}/like`, {
  method: "PATCH",
  headers: { "X-Visitor-Id": visitorB },
  body: JSON.stringify({ liked: true }),
});
assert.equal((await duplicateLikeResponse.json()).idea.likes, 1);

const visitorAListResponse = await api("/ideas", { headers: { "X-Visitor-Id": visitorA } });
const visitorAIdea = (await visitorAListResponse.json()).ideas.find((idea) => idea.id === created.id);
assert.equal(visitorAIdea.likes, 1);
assert.equal(visitorAIdea.liked, false);

const unlikeResponse = await api(`/ideas/${created.id}/like`, {
  method: "PATCH",
  headers: { "X-Visitor-Id": visitorB },
  body: JSON.stringify({ liked: false }),
});
assert.equal((await unlikeResponse.json()).idea.likes, 0);

console.log(JSON.stringify({
  status: "passed",
  apiBaseUrl,
  initialIdeas: initialIdeas.length,
  createdIdeaId: created.id,
  marker,
}, null, 2));
