# Testing

Scaffold chỉ có health endpoints và kiểm tra khói tối thiểu. Khi phát triển từng vertical slice, bổ sung:

- Backend unit test cho validation, quyền, ownership và state transition.
- Backend integration test với migration và database thật trong container.
- Frontend component/integration test cho loading, empty, success và failure states.
- AI contract test cho feature schema, model version, timeout và fallback.
- End-to-end test cho luồng chủ dự án → xét duyệt → phát hành → tài trợ → báo cáo tiến độ.
