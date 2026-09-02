import assert from "node:assert/strict";
import test from "node:test";

import { ApiError, categorizeIdea, validateContent } from "../src/index.js";

test("categorizeIdea recognizes the supported categories", () => {
  assert.equal(categorizeIdea("帮我整理会议待办和工作日程"), "效率工具");
  assert.equal(categorizeIdea("提醒冰箱食材什么时候过期"), "生活服务");
  assert.equal(categorizeIdea("每天复习单词和读书笔记"), "学习成长");
  assert.equal(categorizeIdea("和朋友一起安排旅行活动"), "社交娱乐");
  assert.equal(categorizeIdea("一个从未见过的新奇点子"), "其他灵感");
});

test("validateContent trims valid content", () => {
  assert.equal(validateContent("  一个认真描述的想法  "), "一个认真描述的想法");
});

test("validateContent rejects empty and oversized content", () => {
  assert.throws(() => validateContent("   "), ApiError);
  assert.throws(() => validateContent("想".repeat(281)), ApiError);
});

test("validateContent rejects spam-like content", () => {
  assert.throws(() => validateContent("哈".repeat(20)), /重复字符/);
  assert.throws(
    () => validateContent("https://one.example https://two.example https://three.example"),
    /最多包含两个链接/
  );
  assert.throws(() => validateContent("正常文字\u0000隐藏控制符"), /控制字符/);
});
