import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";

import { looksLikeHtml, sanitizeRichText } from "../src/common/html/rich-text";

describe("sanitizeRichText", () => {
  it("should keep plain text untouched", () => {
    equal(sanitizeRichText("Nhà & trường\n\nĐoạn 2"), "Nhà & trường\n\nĐoạn 2");
    equal(looksLikeHtml("a < b"), false);
  });

  it("should keep editor formatting and images", () => {
    const html = '<h3>Tiêu đề</h3><p><strong>Đậm</strong> <em>nghiêng</em></p><figure class="image"><img src="/api/v1/media/abc" alt="Ảnh"></figure>';
    equal(sanitizeRichText(html), html.replace('alt="Ảnh">', 'alt="Ảnh" />'));
  });

  it("should strip scripts, event handlers and javascript/data URLs", () => {
    const dirty = sanitizeRichText(
      '<p onclick="alert(1)">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="data:image/png;base64,AAAA">',
    );
    ok(!dirty.includes("script"));
    ok(!dirty.includes("onclick"));
    ok(!dirty.includes("javascript:"));
    ok(!dirty.includes("data:"));
  });

  it("should open links in a new tab safely", () => {
    const html = sanitizeRichText('<p><a href="https://example.com">link</a></p>');
    ok(html.includes('target="_blank"'));
    ok(html.includes('rel="noopener noreferrer nofollow"'));
  });
});
