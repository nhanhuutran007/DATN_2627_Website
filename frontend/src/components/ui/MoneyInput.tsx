"use client";

import { ChangeEvent, InputHTMLAttributes, useLayoutEffect, useRef } from "react";

const SUFFIX = "đ";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  /** Chuỗi chỉ gồm chữ số, ví dụ "50000". */
  value: string;
  onChange: (digits: string) => void;
};

function format(digits: string) {
  return digits ? `${Number(digits).toLocaleString("vi-VN")}${SUFFIX}` : "";
}

/** Vị trí con trỏ ngay sau chữ số thứ `count` trong chuỗi đã định dạng. */
function caretAfterDigits(text: string, count: number) {
  if (count === 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i]) && ++seen === count) return i + 1;
  }
  return Math.max(0, text.length - SUFFIX.length);
}

/** Ô nhập số tiền: hiển thị "50.000đ" nhưng trả về chuỗi chữ số "50000". */
export function MoneyInput({ value, onChange, ...rest }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const display = format(value);

  useLayoutEffect(() => {
    if (caret.current === null || !ref.current) return;
    const pos = caretAfterDigits(display, caret.current);
    ref.current.setSelectionRange(pos, pos);
    caret.current = null;
  }, [display]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const selection = e.target.selectionStart ?? raw.length;
    let digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    let digitsBefore = raw.slice(0, selection).replace(/\D/g, "").length;

    // Xoá lùi vào ký tự "đ" thì xoá chữ số cuối cùng thay vì không làm gì.
    if (display.endsWith(SUFFIX) && !raw.endsWith(SUFFIX) && raw.length === display.length - 1) {
      digits = digits.slice(0, -1);
      digitsBefore = digits.length;
    }

    caret.current = Math.min(digitsBefore, digits.length);
    onChange(digits);
  }

  return <input {...rest} ref={ref} type="text" inputMode="numeric" value={display} onChange={handleChange} />;
}
