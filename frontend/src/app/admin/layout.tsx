import { AdminDashboard } from "@/features/admin/AdminDashboard";

// Sidebar và dữ liệu nằm ở layout nên giữ nguyên khi chuyển giữa các mục quản trị;
// AdminDashboard tự chọn mục cần hiển thị theo URL.
export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AdminDashboard />
      {children}
    </>
  );
}
