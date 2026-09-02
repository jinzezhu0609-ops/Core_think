"use strict";

document.documentElement.classList.add("js");

/**
 * 远程公开接口配置：
 * 在加载本脚本前设置 window.CORE_THINKING_API_BASE_URL，数据层就会改用 HTTP 接口。
 * 当前留空时使用 localStorage，便于直接双击 HTML 体验完整交互。
 */
const APP_CONFIG = {
  apiBaseUrl: String(window.CORE_THINKING_API_BASE_URL || "").replace(/\/$/, ""),
  storageKey: "core-thinking.ideas.v1",
  publicCacheKey: "core-thinking.public-cache.v1",
  visitorStorageKey: "core-thinking.visitor-id.v1",
  contentLimit: 280,
};

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const daysAgo = (days, hour = 11) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 12, 0, 0);
  return date.toISOString();
};

const SEED_IDEAS = [
  {
    id: "seed-fridge-helper",
    content: "希望有个能记录冰箱食材的小程序，在快过期时提醒我，还能根据现有食材推荐今晚做什么。",
    category: "生活服务",
    createdAt: minutesAgo(18),
    likes: 36,
    liked: false,
  },
  {
    id: "seed-meeting-summary",
    content: "把会议里的语音快速整理成待办事项，并自动标出负责人和截止时间，开完会就不用再手抄一遍。",
    category: "效率工具",
    createdAt: minutesAgo(74),
    likes: 52,
    liked: false,
  },
  {
    id: "seed-study-focus",
    content: "想要一个和朋友一起专注学习的小工具：不用一直聊天，但能看到彼此今天认真了多久，互相给一点鼓励。",
    category: "学习成长",
    createdAt: minutesAgo(165),
    likes: 29,
    liked: false,
  },
  {
    id: "seed-family-medicine",
    content: "给家里老人用的极简吃药提醒，字要大、操作要少，漏服后可以悄悄通知家人。",
    category: "生活服务",
    createdAt: minutesAgo(286),
    likes: 68,
    liked: false,
  },
  {
    id: "seed-trip-planner",
    content: "朋友一起旅行时，把想去的地点都丢进去，自动排出不绕路的行程，也能一起投票和分账。",
    category: "社交娱乐",
    createdAt: minutesAgo(430),
    likes: 44,
    liked: false,
  },
  {
    id: "seed-reading-review",
    content: "读书时收藏的句子总会被遗忘，希望每天随机推送一条旧笔记，让读过的内容真正留下来。",
    category: "学习成长",
    createdAt: daysAgo(1, 20),
    likes: 21,
    liked: false,
  },
  {
    id: "seed-community-map",
    content: "做一张附近公共空间的安静程度地图，想找自习、开会或者独处的地方时可以快速筛选。",
    category: "其他灵感",
    createdAt: daysAgo(2, 14),
    likes: 31,
    liked: false,
  },
  {
    id: "seed-pet-calendar",
    content: "宠物疫苗、驱虫、体检和囤粮日期都放在一个日历里，家里几个人都能同步完成状态。",
    category: "生活服务",
    createdAt: daysAgo(3, 9),
    likes: 18,
    liked: false,
  },
  {
    id: "seed-idea-capsule",
    content: "随手记录一闪而过的念头，一个月后再寄回给自己；到时候决定继续实现，还是笑着把它归档。",
    category: "效率工具",
    createdAt: daysAgo(5, 16),
    likes: 25,
    liked: false,
  },
];

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

const CATEGORY_STYLES = {
  "效率工具": "purple",
  "生活服务": "orange",
  "学习成长": "yellow",
  "社交娱乐": "blue",
  "其他灵感": "mint",
};

const state = {
  ideas: [],
  query: "",
  category: "全部",
  sort: "latest",
  lastCreatedId: null,
};

const elements = {};
let toastTimer = null;
let memoryVisitorId = "";

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createVisitorId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function getVisitorId() {
  if (memoryVisitorId) return memoryVisitorId;

  try {
    const stored = window.localStorage.getItem(APP_CONFIG.visitorStorageKey);
    if (stored) {
      memoryVisitorId = stored;
      return memoryVisitorId;
    }

    memoryVisitorId = createVisitorId();
    window.localStorage.setItem(APP_CONFIG.visitorStorageKey, memoryVisitorId);
  } catch (error) {
    memoryVisitorId = createVisitorId();
    console.warn("无法持久保存匿名访客标识，本次访问仍可正常使用：", error);
  }

  return memoryVisitorId;
}

function cloneIdeas(ideas) {
  return ideas.map((idea) => ({ ...idea }));
}

function normalizeIdea(candidate) {
  if (!candidate || typeof candidate !== "object") return null;

  const content = String(candidate.content || "").trim().slice(0, APP_CONFIG.contentLimit);
  if (!content) return null;

  const category = Object.hasOwn(CATEGORY_STYLES, candidate.category)
    ? candidate.category
    : categorizeIdea(content);
  const parsedTime = Date.parse(candidate.createdAt);

  return {
    id: String(candidate.id || createId()),
    content,
    category,
    createdAt: Number.isNaN(parsedTime) ? new Date().toISOString() : new Date(parsedTime).toISOString(),
    likes: Math.max(0, Number.parseInt(candidate.likes, 10) || 0),
    liked: Boolean(candidate.liked),
  };
}

function categorizeIdea(content) {
  const normalizedContent = content.toLowerCase();
  const result = CATEGORY_RULES
    .map((rule) => ({
      category: rule.category,
      score: rule.words.reduce((total, word) => total + (normalizedContent.includes(word) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return result && result.score > 0 ? result.category : "其他灵感";
}

const IdeaDataAdapter = {
  memoryIdeas: cloneIdeas(SEED_IDEAS),
  storageWarning: false,
  usingPublicCache: false,

  async request(path, options = {}) {
    const response = await fetch(`${APP_CONFIG.apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Visitor-Id": getVisitorId(),
        ...(options.headers || {}),
      },
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload && payload.error
        ? payload.error
        : `公开数据接口请求失败（${response.status}）`);
    }

    return payload;
  },

  readPublicCache() {
    try {
      const stored = window.localStorage.getItem(APP_CONFIG.publicCacheKey);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeIdea).filter(Boolean);
    } catch (error) {
      console.warn("无法读取公开灵感缓存：", error);
      return [];
    }
  },

  writePublicCache(ideas) {
    try {
      window.localStorage.setItem(APP_CONFIG.publicCacheKey, JSON.stringify(ideas));
    } catch (error) {
      console.warn("无法保存公开灵感缓存：", error);
    }
  },

  readLocal() {
    try {
      const stored = window.localStorage.getItem(APP_CONFIG.storageKey);
      if (stored === null) {
        this.writeLocal(this.memoryIdeas);
        return cloneIdeas(this.memoryIdeas);
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("本地数据格式无效");

      const ideas = parsed.map(normalizeIdea).filter(Boolean);
      this.memoryIdeas = ideas;
      return cloneIdeas(ideas);
    } catch (error) {
      this.storageWarning = true;
      console.warn("无法读取本地灵感，已切换到临时会话数据：", error);
      return cloneIdeas(this.memoryIdeas);
    }
  },

  writeLocal(ideas) {
    this.memoryIdeas = cloneIdeas(ideas);
    try {
      window.localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(ideas));
    } catch (error) {
      this.storageWarning = true;
      console.warn("无法写入本地灵感，本次更改仅在当前页面有效：", error);
    }
  },

  async listIdeas() {
    if (APP_CONFIG.apiBaseUrl) {
      try {
        const payload = await this.request("/ideas");
        const items = Array.isArray(payload) ? payload : payload.ideas;
        const ideas = (Array.isArray(items) ? items : []).map(normalizeIdea).filter(Boolean);
        this.usingPublicCache = false;
        this.writePublicCache(ideas);
        return ideas;
      } catch (error) {
        const cachedIdeas = this.readPublicCache();
        if (!cachedIdeas.length) throw error;
        this.usingPublicCache = true;
        return cachedIdeas;
      }
    }
    return this.readLocal();
  },

  async createIdea(content) {
    const newIdea = {
      id: createId(),
      content: content.trim(),
      category: categorizeIdea(content),
      createdAt: new Date().toISOString(),
      likes: 0,
      liked: false,
    };

    if (APP_CONFIG.apiBaseUrl) {
      const created = await this.request("/ideas", {
        method: "POST",
        body: JSON.stringify({ content: newIdea.content }),
      });
      return normalizeIdea(created.idea || created) || newIdea;
    }

    const ideas = this.readLocal();
    ideas.unshift(newIdea);
    this.writeLocal(ideas);
    return { ...newIdea };
  },

  async toggleLike(id, shouldLike) {
    if (APP_CONFIG.apiBaseUrl) {
      const updated = await this.request(`/ideas/${encodeURIComponent(id)}/like`, {
        method: "PATCH",
        body: JSON.stringify({ liked: shouldLike }),
      });
      return normalizeIdea(updated.idea || updated);
    }

    const ideas = this.readLocal();
    const index = ideas.findIndex((idea) => idea.id === id);
    if (index < 0) throw new Error("没有找到这条灵感");

    const idea = ideas[index];
    idea.likes = Math.max(0, idea.likes + (shouldLike ? 1 : -1));
    idea.liked = shouldLike;
    this.writeLocal(ideas);
    return { ...idea };
  },
};

function cacheElements() {
  Object.assign(elements, {
    form: document.querySelector("#idea-form"),
    input: document.querySelector("#idea-input"),
    inputShell: document.querySelector(".input-shell"),
    error: document.querySelector("#idea-error"),
    charCount: document.querySelector("#char-count"),
    characterCount: document.querySelector(".character-count"),
    submitButton: document.querySelector("#submit-idea"),
    grid: document.querySelector("#idea-grid"),
    search: document.querySelector("#idea-search"),
    sort: document.querySelector("#idea-sort"),
    filters: document.querySelector("#category-filters"),
    resultCount: document.querySelector("#result-count"),
    emptyState: document.querySelector("#empty-state"),
    statTotal: document.querySelector("#stat-total"),
    statToday: document.querySelector("#stat-today"),
    statLikes: document.querySelector("#stat-likes"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toast-message"),
    clearFilters: document.querySelector("#clear-filters"),
    composer: document.querySelector("#composer"),
  });
}

function setupEventListeners() {
  elements.input.addEventListener("input", updateComposerState);
  elements.form.addEventListener("submit", handleSubmit);
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderIdeas();
  });
  elements.sort.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderIdeas();
  });
  elements.filters.addEventListener("click", handleCategoryChange);
  elements.grid.addEventListener("click", handleLikeClick);
  elements.clearFilters.addEventListener("click", clearFilters);

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => insertPrompt(button.dataset.prompt));
  });

  document.querySelectorAll("#open-composer, #bottom-compose").forEach((button) => {
    button.addEventListener("click", focusComposer);
  });
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function updateComposerState() {
  const length = elements.input.value.length;
  const hasContent = elements.input.value.trim().length > 0;

  elements.charCount.textContent = String(length);
  elements.submitButton.disabled = !hasContent || length > APP_CONFIG.contentLimit;
  elements.characterCount.classList.toggle("is-near-limit", length >= 250);

  if (hasContent) clearFormError();
}

function insertPrompt(prompt) {
  if (!elements.input.value.trim()) {
    elements.input.value = prompt;
  } else {
    const separator = elements.input.value.endsWith("\n") ? "" : "\n";
    elements.input.value = `${elements.input.value}${separator}${prompt}`.slice(0, APP_CONFIG.contentLimit);
  }
  updateComposerState();
  elements.input.focus();
  elements.input.setSelectionRange(elements.input.value.length, elements.input.value.length);
}

function showFormError(message) {
  elements.error.textContent = message;
  elements.inputShell.classList.add("is-invalid");
  elements.input.setAttribute("aria-invalid", "true");
}

function clearFormError() {
  elements.error.textContent = "";
  elements.inputShell.classList.remove("is-invalid");
  elements.input.removeAttribute("aria-invalid");
}

async function handleSubmit(event) {
  event.preventDefault();
  const content = elements.input.value.trim();

  if (!content) {
    showFormError("先写下一点想法，再把它发射出去吧。");
    elements.input.focus();
    return;
  }

  if (content.length > APP_CONFIG.contentLimit) {
    showFormError(`内容不能超过 ${APP_CONFIG.contentLimit} 个字。`);
    elements.input.focus();
    return;
  }

  const buttonLabel = elements.submitButton.querySelector("span");
  const originalLabel = buttonLabel.textContent;
  elements.submitButton.disabled = true;
  buttonLabel.textContent = "正在发射…";

  try {
    const created = await IdeaDataAdapter.createIdea(content);
    state.ideas = [created, ...state.ideas.filter((idea) => idea.id !== created.id)];
    if (APP_CONFIG.apiBaseUrl) IdeaDataAdapter.writePublicCache(state.ideas);
    state.lastCreatedId = created.id;
    state.query = "";
    state.category = "全部";
    state.sort = "latest";
    elements.search.value = "";
    elements.sort.value = "latest";
    syncFilterButtons();
    elements.input.value = "";
    clearFormError();
    updateComposerState();
    renderAll();
    showToast("想法已成功发布，正在灵感墙上闪闪发光！");

    window.setTimeout(() => {
      state.lastCreatedId = null;
    }, 1000);
  } catch (error) {
    showFormError("发布失败，你的内容还在，请稍后再试。");
    showToast(error.message || "发布失败，请稍后再试", true);
  } finally {
    buttonLabel.textContent = originalLabel;
    updateComposerState();
  }
}

function handleCategoryChange(event) {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  state.category = button.dataset.category;
  syncFilterButtons();
  renderIdeas();
}

function syncFilterButtons() {
  elements.filters.querySelectorAll("[data-category]").forEach((button) => {
    const isActive = button.dataset.category === state.category;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

async function handleLikeClick(event) {
  const button = event.target.closest("[data-like-id]");
  if (!button || button.disabled) return;

  const id = button.dataset.likeId;
  const current = state.ideas.find((idea) => idea.id === id);
  if (!current) return;

  button.disabled = true;
  try {
    const updated = await IdeaDataAdapter.toggleLike(id, !current.liked);
    if (!updated) throw new Error("点赞状态更新失败");
    state.ideas = state.ideas.map((idea) => (idea.id === id ? updated : idea));
    if (APP_CONFIG.apiBaseUrl) IdeaDataAdapter.writePublicCache(state.ideas);
    renderAll();
  } catch (error) {
    button.disabled = false;
    showToast(error.message || "暂时无法点赞，请稍后再试", true);
  }
}

function clearFilters() {
  state.query = "";
  state.category = "全部";
  state.sort = "latest";
  elements.search.value = "";
  elements.sort.value = "latest";
  syncFilterButtons();
  renderIdeas();
  elements.search.focus();
}

function focusComposer() {
  elements.composer.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => elements.input.focus({ preventScroll: true }), 450);
}

function getVisibleIdeas() {
  const filtered = state.ideas.filter((idea) => {
    const matchesQuery = !state.query || idea.content.toLowerCase().includes(state.query);
    const matchesCategory = state.category === "全部" || idea.category === state.category;
    return matchesQuery && matchesCategory;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "popular") {
      return b.likes - a.likes || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

function createSvgIcon(pathData, viewBox = "0 0 24 24") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  return svg;
}

function buildIdeaCard(idea) {
  const article = document.createElement("article");
  article.className = `idea-card idea-card--${CATEGORY_STYLES[idea.category] || "mint"}`;
  if (idea.id === state.lastCreatedId) article.classList.add("idea-card--new");

  const header = document.createElement("header");
  header.className = "idea-card__header";

  const category = document.createElement("span");
  category.className = "category-tag";
  category.textContent = idea.category;

  const time = document.createElement("time");
  time.className = "idea-time";
  time.dateTime = idea.createdAt;
  time.textContent = formatRelativeTime(idea.createdAt);

  header.append(category, time);

  const content = document.createElement("p");
  content.className = "idea-card__content";
  content.textContent = idea.content;

  const footer = document.createElement("footer");
  footer.className = "idea-card__footer";

  const anonymous = document.createElement("span");
  anonymous.className = "anonymous-label";
  const avatar = document.createElement("span");
  avatar.className = "anonymous-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "匿";
  anonymous.append(avatar, document.createTextNode("匿名贡献者"));

  const likeButton = document.createElement("button");
  likeButton.type = "button";
  likeButton.className = `like-button${idea.liked ? " is-liked" : ""}`;
  likeButton.dataset.likeId = idea.id;
  likeButton.setAttribute("aria-pressed", String(idea.liked));
  likeButton.setAttribute("aria-label", `${idea.liked ? "取消赞同" : "赞同"}：${idea.content.slice(0, 35)}`);
  likeButton.appendChild(createSvgIcon("M12 20.2S4 15.5 4 9.7C4 6.9 6 5 8.5 5c1.5 0 2.8.8 3.5 1.9C12.7 5.8 14 5 15.5 5 18 5 20 6.9 20 9.7c0 5.8-8 10.5-8 10.5Z"));
  const likeText = document.createElement("span");
  likeText.textContent = idea.liked ? `已赞同 ${idea.likes}` : `赞同 ${idea.likes}`;
  likeButton.appendChild(likeText);

  footer.append(anonymous, likeButton);
  article.append(header, content, footer);
  return article;
}

function formatRelativeTime(dateString) {
  const time = Date.parse(dateString);
  if (Number.isNaN(time)) return "刚刚";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;

  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(time));
}

function isToday(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function renderStats() {
  const totalLikes = state.ideas.reduce((sum, idea) => sum + idea.likes, 0);
  elements.statTotal.textContent = String(state.ideas.length);
  elements.statToday.textContent = String(state.ideas.filter((idea) => isToday(idea.createdAt)).length);
  elements.statLikes.textContent = String(totalLikes);
}

function renderIdeas() {
  const visibleIdeas = getVisibleIdeas();
  const fragment = document.createDocumentFragment();
  visibleIdeas.forEach((idea) => fragment.appendChild(buildIdeaCard(idea)));

  elements.grid.replaceChildren(fragment);
  elements.grid.setAttribute("aria-busy", "false");
  elements.resultCount.textContent = String(visibleIdeas.length);
  elements.grid.hidden = visibleIdeas.length === 0;
  elements.emptyState.hidden = visibleIdeas.length !== 0;
}

function renderAll() {
  renderStats();
  renderIdeas();
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  elements.toastMessage.textContent = message;
  elements.toast.classList.toggle("is-error", isError);
  elements.toast.querySelector(".toast__icon").textContent = isError ? "!" : "✓";
  elements.toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3200);
}

async function init() {
  cacheElements();
  setupEventListeners();
  setupRevealAnimations();
  updateComposerState();

  try {
    state.ideas = await IdeaDataAdapter.listIdeas();
    renderAll();
    if (IdeaDataAdapter.usingPublicCache) {
      showToast("网络暂时不可用，当前展示最近一次公开数据", true);
    } else if (IdeaDataAdapter.storageWarning) {
      showToast("浏览器存储不可用，本次更改只在当前页面保留", true);
    }
  } catch (error) {
    state.ideas = cloneIdeas(SEED_IDEAS);
    renderAll();
    showToast("暂时无法读取公开数据，已展示体验内容", true);
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", init);
