// Kiểm thử bộ khớp câu hỏi của hộp hỗ trợ. Chạy: npm run test --workspace frontend
// (Node >= 22.18 tự bỏ kiểu TypeScript khi import file .ts.)
import assert from "node:assert/strict";
import { test } from "node:test";

import { FAQ_ITEMS, matchFaq, VISIBLE_FAQ_ITEMS } from "./faq.ts";

/** [câu người dùng gõ, id câu trả lời mong đợi] */
const CASES = [
  // Câu đã có, diễn đạt kiểu khác
  ["Góp Mầm là gì?", "gioi-thieu"],
  ["góp mầm có uy tín không", "gioi-thieu"],
  ["hãy cho tôi biết 1 vài lĩnh vực", "linh-vuc"],
  ["co nhung linh vuc nao", "linh-vuc"],
  ["danh mục dự án", "linh-vuc"],
  ["Làm sao để ủng hộ một dự án?", "cach-ung-ho"],
  ["trả tiền kiểu gì", "thanh-toan"],
  ["ủng hộ bằng momo được không", "thanh-toan"],
  ["tôi đã chuyển tiền rồi mà chưa thấy", "cho-xac-nhan"],
  ["lấy lại tiền", "hoan-tien"],
  ["chiến dịch không đạt mục tiêu thì sao", "hoan-tien"],
  ["bao lâu thì được duyệt", "xet-duyet"],
  ["gia hạn chiến dịch", "xet-duyet"],
  ["dự án có thật không", "minh-bach"],
  ["báo cáo chi tiêu như thế nào", "minh-bach"],
  ["bị lừa thì sao", "bao-cao"],
  ["quên pass", "quen-mat-khau"],
  ["tài khoản bị khóa", "quen-mat-khau"],
  ["tạo chiến dịch", "tao-chien-dich"],
  ["Gợi ý AI dùng dữ liệu gì", "goi-y-ai"],
  // Câu mới
  ["ủng hộ tối thiểu bao nhiêu tiền", "ung-ho-chi-tiet"],
  ["có ủng hộ ẩn danh được không", "ung-ho-chi-tiet"],
  ["quà tri ân là gì", "qua-tri-an"],
  ["lấy biên nhận ở đâu", "bien-nhan"],
  ["xem lại lịch sử ủng hộ ở đâu", "bien-nhan"],
  ["tổ chức đăng ký thế nào", "to-chuc"],
  ["theo dõi dự án để làm gì", "theo-doi"],
  ["làm sao để đăng ký tài khoản", "tai-khoan"],
  ["không nhận được email xác minh", "tai-khoan"],
  ["đăng nhập bằng google được không", "tai-khoan"],
  // Xã giao
  ["xin chào", "chao-hoi"],
  ["cảm ơn", "cam-on"],
  ["chào bạn, cho hỏi cách ủng hộ", "cach-ung-ho"],
];

for (const [question, expected] of CASES) {
  test(`"${question}" → ${expected}`, () => {
    assert.equal(matchFaq(question)?.id, expected);
  });
}

test("câu không liên quan trả về null", () => {
  assert.equal(matchFaq("thời tiết hôm nay thế nào"), null);
  assert.equal(matchFaq("   "), null);
});

test("câu xã giao không hiện trong danh sách gợi ý", () => {
  assert.ok(VISIBLE_FAQ_ITEMS.every((item) => !item.hidden));
  assert.ok(VISIBLE_FAQ_ITEMS.length < FAQ_ITEMS.length);
});

test("id và từ khóa hợp lệ", () => {
  const ids = FAQ_ITEMS.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "id bị trùng");
  for (const item of FAQ_ITEMS) {
    for (const keyword of item.keywords) {
      assert.match(keyword, /^[a-z0-9]+( [a-z0-9]+)*$/, `từ khóa "${keyword}" phải viết thường, không dấu`);
    }
  }
});
