"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Lỗi ngoài dự kiến khi hiển thị một trang: báo bằng tiếng Việt và cho thử lại. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container status-page">
      <div role="alert">
        <h1>Đã có lỗi xảy ra</h1>
        <p>Trang này tạm thời không hiển thị được. Bạn hãy thử lại; nếu vẫn lỗi, vui lòng quay lại sau ít phút.</p>
        {error.digest && <p className="hint">Mã lỗi: {error.digest}</p>}
        <div className="status-actions">
          <button className="button button-primary" type="button" onClick={() => retry()}>Thử lại</button>
          <Link className="button button-outline" href="/">Về trang chủ</Link>
        </div>
      </div>
    </main>
  );
}
