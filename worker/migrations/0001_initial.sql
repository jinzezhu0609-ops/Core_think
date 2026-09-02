PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 280),
  category TEXT NOT NULL CHECK (
    category IN ('效率工具', '生活服务', '学习成长', '社交娱乐', '其他灵感')
  ),
  created_at TEXT NOT NULL,
  base_likes INTEGER NOT NULL DEFAULT 0 CHECK (base_likes >= 0)
);

CREATE INDEX IF NOT EXISTS idx_ideas_created_at
  ON ideas (created_at DESC);

CREATE TABLE IF NOT EXISTS idea_likes (
  idea_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (idea_id, visitor_hash),
  FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_idea_likes_idea_id
  ON idea_likes (idea_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count >= 0)
);

INSERT OR IGNORE INTO ideas (id, content, category, created_at, base_likes) VALUES
  ('seed-fridge-helper', '希望有个能记录冰箱食材的小程序，在快过期时提醒我，还能根据现有食材推荐今晚做什么。', '生活服务', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-18 minutes'), 36),
  ('seed-meeting-summary', '把会议里的语音快速整理成待办事项，并自动标出负责人和截止时间，开完会就不用再手抄一遍。', '效率工具', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-74 minutes'), 52),
  ('seed-study-focus', '想要一个和朋友一起专注学习的小工具：不用一直聊天，但能看到彼此今天认真了多久，互相给一点鼓励。', '学习成长', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-165 minutes'), 29),
  ('seed-family-medicine', '给家里老人用的极简吃药提醒，字要大、操作要少，漏服后可以悄悄通知家人。', '生活服务', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-286 minutes'), 68),
  ('seed-trip-planner', '朋友一起旅行时，把想去的地点都丢进去，自动排出不绕路的行程，也能一起投票和分账。', '社交娱乐', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-430 minutes'), 44),
  ('seed-reading-review', '读书时收藏的句子总会被遗忘，希望每天随机推送一条旧笔记，让读过的内容真正留下来。', '学习成长', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day'), 21),
  ('seed-community-map', '做一张附近公共空间的安静程度地图，想找自习、开会或者独处的地方时可以快速筛选。', '其他灵感', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-2 days'), 31),
  ('seed-pet-calendar', '宠物疫苗、驱虫、体检和囤粮日期都放在一个日历里，家里几个人都能同步完成状态。', '生活服务', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-3 days'), 18),
  ('seed-idea-capsule', '随手记录一闪而过的念头，一个月后再寄回给自己；到时候决定继续实现，还是笑着把它归档。', '效率工具', strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-5 days'), 25);
