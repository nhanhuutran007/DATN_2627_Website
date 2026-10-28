import os
from pathlib import Path

# Đường dẫn mô hình trong settings là tương đối (models/...) như khi chạy trong Docker
# (WORKDIR /app); chạy pytest từ gốc repo vẫn phải tìm thấy các file mô hình đã commit.
os.chdir(Path(__file__).resolve().parent.parent)
