const ALLOWED_ORIGINS = new Set([
  "https://jinzezhu0609-ops.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);

const CONTENT_LIMIT = 280;
const BODY_LIMIT = 4096;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_POSTS = 3;
const VALID_ID_PATTERN = /^[A-Za-z0-9-]{1,80}$/;
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CATEGORY_RULES = [
  {
    category: "效率工具",
    words: ["效率", "计划", "日程", "待办", "提醒", "整理", "记录", "会议", "工作", "时间", "记账", "文件"],
  },
  {
    category: "生活服务",
    words: ["生活", "食材", "冰箱", "做饭", "吃药", "健康", "睡眠", "运动", "快递", "购物", "宠物", "家人", "天气"],
  },
  {
    category: "学习成长",
    words: ["学习", "读书", "阅读", "课程", "考试", "复习", "单词", "知识", "笔记", "专注", "成长"],
  },
  {
    category: "社交娱乐",
    words: ["朋友", "社交", "聚会", "旅行", "游戏", "音乐", "电影", "活动", "兴趣", "一起", "组队"],
  },
];

export class ApiError extends Error {
  constructor(status, message, headers = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.headers = headers;
  }
}

export function categorizeIdea(content) {
  const normalizedContent = content.toLowerCase();
  const match = CATEGORY_RULES
    .map((rule) => ({
      category: rule.category,
      score: rule.words.reduce((total, word) => total + (normalizedContent.includes(word) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return match && match.score > 0 ? match.category : "其他灵感";
}

export function validateContent(value) {
  if (typeof value !== "string") throw new ApiError(400, "建议内容格式不正确");

  const content = value.trim();
  if (!content) throw new ApiError(400, "请先写下一点想法");
  if (content.length > CONTENT_LIMIT) throw new ApiError(400, `内容不能超过 ${CONTENT_LIMIT} 个字`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(content)) {
    throw new ApiError(400, "内容包含不支持的控制字符");
  }
  if (/(.)\1{19,}/u.test(content)) throw new ApiError(400, "请减少连续重复字符后再发布");

  const urlCount = (content.match(/(?:https?:\/\/|www\.)/giu) || []).length;
  if (urlCount > 2) throw new ApiError(400, "一条建议最多包含两个链接");

  return content;
}

function corsHeaders(origin) {
  const headers = new Headers({ Vary: "Origin" });
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return headers;

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Visitor-Id");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

function jsonResponse(data, status = 200, origin = null, extraHeaders = {}) {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  Object.entries(extraHeaders).forEach(([name, value]) => headers.set(name, value));
  return new Response(JSON.stringify(data), { status, headers });
}

async function readJson(request) {
  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (declaredLength > BODY_LIMIT) throw new ApiError(413, "请求内容过大");

  const rawBody = await request.text();
  if (rawBody.length > BODY_LIMIT) throw new ApiError(413, "请求内容过大");

  try {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid object");
    return parsed;
  } catch {
    throw new ApiError(400, "请求不是有效的 JSON");
  }
}

async function hashValue(value, salt) {
  if (!salt || salt.length < 16) throw new ApiError(503, "服务端安全配置尚未完成");
  const bytes = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getVisitorHash(request, env, required = false) {
  const visitorId = request.headers.get("X-Visitor-Id") || "";
  if (!visitorId) {
    if (required) throw new ApiError(400, "缺少匿名访客标识，请刷新页面后重试");
    return "";
  }
  if (!VISITOR_ID_PATTERN.test(visitorId)) throw new ApiError(400, "匿名访客标识无效");
  return hashValue(visitorId, env.LIKE_HASH_SALT);
}

function mapIdea(row) {
  return {
    id: String(row.id),
    content: String(row.content),
    category: String(row.category),
    createdAt: String(row.created_at),
    likes: Math.max(0, Number(row.likes) || 0),
    liked: Boolean(row.liked),
  };
}

async function selectIdea(env, id, visitorHash) {
  const row = await env.DB.prepare(
    `SELECT
       i.id,
       i.content,
       i.category,
       i.created_at,
       i.base_likes + COUNT(l.visitor_hash) AS likes,
       MAX(CASE WHEN l.visitor_hash = ?1 THEN 1 ELSE 0 END) AS liked
     FROM ideas i
     LEFT JOIN idea_likes l ON l.idea_id = i.id
     WHERE i.id = ?2
     GROUP BY i.id, i.content, i.category, i.created_at, i.base_likes`
  ).bind(visitorHash || "__no_visitor__", id).first();

  return row ? mapIdea(row) : null;
}

async function listIdeas(request, env, origin) {
  const visitorHash = await getVisitorHash(request, env, false);
  const result = await env.DB.prepare(
    `SELECT
       i.id,
       i.content,
       i.category,
       i.created_at,
       i.base_likes + COUNT(l.visitor_hash) AS likes,
       MAX(CASE WHEN l.visitor_hash = ?1 THEN 1 ELSE 0 END) AS liked
     FROM ideas i
     LEFT JOIN idea_likes l ON l.idea_id = i.id
     GROUP BY i.id, i.content, i.category, i.created_at, i.base_likes
     ORDER BY i.created_at DESC
     LIMIT 100`
  ).bind(visitorHash || "__no_visitor__").all();

  return jsonResponse({ ideas: result.results.map(mapIdea) }, 200, origin);
}

async function applySubmissionRateLimit(request, env) {
  const connectingIp = request.headers.get("CF-Connecting-IP") || "local-development";
  const rateKey = await hashValue(connectingIp, env.RATE_LIMIT_SALT);
  const windowStart = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;

  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       window_start = excluded.window_start,
       count = CASE
         WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1
         ELSE 1
       END
     RETURNING count`
  ).bind(rateKey, windowStart).first();

  if (Number(row.count) > RATE_LIMIT_MAX_POSTS) {
    const retryAfter = Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000));
    throw new ApiError(429, "发布得有点快，请稍后再试", { "Retry-After": String(retryAfter) });
  }

  if (Math.random() < 0.05) {
    await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?1")
      .bind(Date.now() - 24 * 60 * 60 * 1000)
      .run();
  }
}

async function createIdea(request, env, origin) {
  const payload = await readJson(request);
  const content = validateContent(payload.content);
  await applySubmissionRateLimit(request, env);

  const idea = {
    id: crypto.randomUUID(),
    content,
    category: categorizeIdea(content),
    createdAt: new Date().toISOString(),
    likes: 0,
    liked: false,
  };

  await env.DB.prepare(
    "INSERT INTO ideas (id, content, category, created_at, base_likes) VALUES (?1, ?2, ?3, ?4, 0)"
  ).bind(idea.id, idea.content, idea.category, idea.createdAt).run();

  return jsonResponse({ idea }, 201, origin);
}

async function toggleLike(request, env, origin, id) {
  if (!VALID_ID_PATTERN.test(id)) throw new ApiError(400, "灵感标识无效");

  const payload = await readJson(request);
  if (typeof payload.liked !== "boolean") throw new ApiError(400, "点赞状态格式不正确");

  const visitorHash = await getVisitorHash(request, env, true);
  const exists = await env.DB.prepare("SELECT id FROM ideas WHERE id = ?1").bind(id).first();
  if (!exists) throw new ApiError(404, "没有找到这条灵感");

  if (payload.liked) {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO idea_likes (idea_id, visitor_hash, created_at) VALUES (?1, ?2, ?3)"
    ).bind(id, visitorHash, new Date().toISOString()).run();
  } else {
    await env.DB.prepare("DELETE FROM idea_likes WHERE idea_id = ?1 AND visitor_hash = ?2")
      .bind(id, visitorHash).run();
  }

  const updated = await selectIdea(env, id, visitorHash);
  return jsonResponse({ idea: updated }, 200, origin);
}

async function healthCheck(env, origin) {
  const row = await env.DB.prepare("SELECT 1 AS ok").first();
  return jsonResponse({ status: row && row.ok === 1 ? "ok" : "degraded" }, 200, origin);
}

async function routeRequest(request, env) {
  const origin = request.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: "此来源不允许访问公开评论接口" }, 403, null);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") return healthCheck(env, origin);
  if (request.method === "GET" && url.pathname === "/ideas") return listIdeas(request, env, origin);
  if (request.method === "POST" && url.pathname === "/ideas") return createIdea(request, env, origin);

  const likeMatch = url.pathname.match(/^\/ideas\/([^/]+)\/like$/);
  if (request.method === "PATCH" && likeMatch) {
    return toggleLike(request, env, origin, decodeURIComponent(likeMatch[1]));
  }

  return jsonResponse({ error: "接口不存在" }, 404, origin);
}

export default {
  async fetch(request, env) {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      if (error instanceof ApiError) {
        return jsonResponse(
          { error: error.message },
          error.status,
          request.headers.get("Origin"),
          error.headers
        );
      }

      console.error("Unhandled API error", error);
      return jsonResponse({ error: "服务器暂时遇到问题，请稍后再试" }, 500, request.headers.get("Origin"));
    }
  },
};
