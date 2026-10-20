"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { FAQ_ITEMS, type FaqItem, matchFaq } from "@/features/support/faq";

/** Độ trễ giả lập "đang trả lời" để câu trả lời không bật ra ngay khi bấm. */
const REPLY_DELAY_MS = 450;
const MAX_INPUT_LENGTH = 200;

type ChatTurn = {
  id: number;
  question: string;
  /** null = không khớp câu hỏi nào, hiện câu trả lời dự phòng. */
  answer: FaqItem | null;
};

/**
 * Hộp hỏi đáp nhanh ở góc phải dưới: chọn câu hỏi có sẵn hoặc tự gõ câu hỏi, câu trả lời lấy từ
 * danh sách soạn sẵn (khớp từ khóa ở trình duyệt, không gửi nội dung đi đâu).
 */
export function FaqChat() {
  const pathname = usePathname();
  const panelId = useId();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [showAll, setShowAll] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const nextIdRef = useRef(0);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Giữ tin nhắn mới nhất trong tầm nhìn.
  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [turns, pending]);

  // Trang quản trị có giao diện riêng, không cần hỏi đáp cho người dùng.
  if (pathname.startsWith("/admin")) return null;

  const typing = pending !== null;

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  function ask(question: string, answer: FaqItem | null) {
    if (typing) return;
    setShowAll(false);
    window.clearTimeout(timerRef.current);
    setPending(question);
    timerRef.current = window.setTimeout(() => {
      nextIdRef.current += 1;
      const id = nextIdRef.current;
      setTurns((list) => [...list, { id, question, answer }]);
      setPending(null);
    }, REPLY_DELAY_MS);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || typing) return;
    setDraft("");
    ask(question, matchFaq(question));
  }

  function reset() {
    window.clearTimeout(timerRef.current);
    setPending(null);
    setTurns([]);
    setDraft("");
    setShowAll(false);
    inputRef.current?.focus();
  }

  const askedIds = new Set(turns.flatMap((turn) => (turn.answer ? [turn.answer.id] : [])));
  // Câu chưa hỏi lên trước để hàng gợi ý luôn mở đầu bằng câu mới.
  const suggestions = [
    ...FAQ_ITEMS.filter((item) => !askedIds.has(item.id)),
    ...FAQ_ITEMS.filter((item) => askedIds.has(item.id)),
  ];

  return (
    <div className={open ? "faq-chat is-open" : "faq-chat"}>
      {open && (
        <div
          id={panelId}
          className="faq-chat-panel"
          role="dialog"
          aria-label="Hỏi đáp nhanh"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <header className="faq-chat-head">
            <div className="faq-chat-title">
              <strong>Hỗ trợ Góp Mầm</strong>
              <span>Trả lời tự động</span>
            </div>
            {turns.length > 0 && (
              <button className="faq-chat-icon-btn" type="button" onClick={reset} aria-label="Bắt đầu lại" title="Bắt đầu lại">
                <Icon name="chevron-left" size={18} />
              </button>
            )}
            <button className="faq-chat-icon-btn" type="button" onClick={close} aria-label="Đóng hộp hỏi đáp">
              <Icon name="x" size={18} />
            </button>
          </header>

          <div ref={bodyRef} className="faq-chat-body">
            <div className="faq-chat-log" aria-live="polite">
              <p className="faq-msg faq-msg-bot">
                Xin chào! Bạn cần hỗ trợ gì? Hãy gõ câu hỏi hoặc chọn một gợi ý bên dưới.
              </p>
              {turns.map((turn) => (
                <div key={turn.id} className="faq-turn">
                  <p className="faq-msg faq-msg-user">{turn.question}</p>
                  {turn.answer ? (
                    <div className="faq-msg faq-msg-bot">
                      <p>{turn.answer.answer}</p>
                      {turn.answer.link && (
                        <Link className="faq-msg-link" href={turn.answer.link.href} onClick={() => setOpen(false)}>
                          {turn.answer.link.label} <Icon name="arrow-right" size={14} />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <p className="faq-msg faq-msg-bot">
                      Xin lỗi, mình chưa hiểu câu hỏi này. Bạn thử diễn đạt khác, hoặc chọn một câu hỏi gợi ý
                      bên dưới nhé.
                    </p>
                  )}
                </div>
              ))}
              {typing && (
                <div className="faq-turn">
                  <p className="faq-msg faq-msg-user">{pending}</p>
                  <p className="faq-msg faq-msg-bot faq-typing" aria-label="Đang trả lời">
                    <i /><i /><i />
                  </p>
                </div>
              )}
            </div>

          </div>

          <div className="faq-chat-suggest">
            <div className="faq-chat-suggest-head">
              <p className="faq-chat-label" id={`${panelId}-goi-y`}>
                {showAll ? "Tất cả câu hỏi" : "Gợi ý câu hỏi"}
              </p>
              <button
                className="faq-chat-more"
                type="button"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? "Thu gọn" : `Xem tất cả (${FAQ_ITEMS.length})`}
              </button>
            </div>
            {showAll ? (
              <ul className="faq-chat-all" aria-labelledby={`${panelId}-goi-y`}>
                {FAQ_ITEMS.map((item) => (
                  <li key={item.id}>
                    <button
                      className={askedIds.has(item.id) ? "faq-question is-asked" : "faq-question"}
                      type="button"
                      disabled={typing}
                      onClick={() => ask(item.question, item)}
                    >
                      {item.question}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul
                className="faq-chips"
                aria-labelledby={`${panelId}-goi-y`}
                onWheel={(event) => {
                  // Chuột thường chỉ cuộn dọc: đổi sang cuộn ngang cho hàng gợi ý.
                  if (event.deltaX === 0) event.currentTarget.scrollLeft += event.deltaY;
                }}
              >
                {suggestions.map((item) => (
                  <li key={item.id}>
                    <button
                      className={askedIds.has(item.id) ? "faq-chip is-asked" : "faq-chip"}
                      type="button"
                      disabled={typing}
                      onClick={() => ask(item.question, item)}
                    >
                      {item.question}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form className="faq-chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor={inputId}>Nhập câu hỏi</label>
            <input
              ref={inputRef}
              id={inputId}
              className="faq-chat-input"
              type="text"
              value={draft}
              maxLength={MAX_INPUT_LENGTH}
              autoComplete="off"
              placeholder="Nhập câu hỏi của bạn…"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="faq-chat-send" type="submit" disabled={typing || !draft.trim()} aria-label="Gửi câu hỏi">
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      )}

      <button
        ref={toggleRef}
        className={open ? "faq-chat-toggle is-open" : "faq-chat-toggle"}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Đóng hộp hỏi đáp" : "Mở hộp hỏi đáp"}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name={open ? "x" : "message"} size={24} />
      </button>
    </div>
  );
}
