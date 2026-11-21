# Deploy lên Render

Repository dùng `render.yaml` để build hai giao diện React và chạy API Express trên cùng một Render Web Service.

1. Đẩy repository lên GitHub hoặc GitLab rồi tạo service bằng **New → Blueprint** trên Render.
2. Cấu hình `MONGODB_URI` trỏ đến MongoDB của nhà hàng. Render tự tạo `JWT_SECRET` theo Blueprint.
3. Trong Environment Variables của service, cấu hình `CLOUDINARY_URL` từ Cloudinary Console, hoặc cấu hình đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET`. `CLOUDINARY_URL` có dạng `cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>`. Khi có URL này, server ưu tiên nó để Cloud name và thông tin xác thực khớp cùng một tài khoản. Cloud name là tên tài khoản trong Cloudinary Console, không phải API Key. Không đưa API Secret hoặc `CLOUDINARY_URL` vào mã giao diện hoặc Git.
4. Để `CLOUDINARY_UPLOAD_FOLDER` là `QR-menu/products` như thư mục Dynamic folders đã tạo.
5. Deploy service `van-lang-restaurant-menu`.

URL gốc mở thực đơn khách; trang đăng nhập quản trị là `/admin/login`, trang lễ tân là `/admin/reception`. Mỗi mã QR lễ tân tạo link `/admin/login?table=01` đến `table=12` dựa trên host hiện tại, vì vậy QR tạo sau khi deploy sẽ dùng đúng URL Render.

Khi thêm món, form chỉ nhận JPG, PNG hoặc WebP tối đa 8 MB. Server ký yêu cầu upload cho tài khoản admin; trình duyệt tải ảnh trực tiếp vào `asset_folder` `QR-menu/products` trên Cloudinary. API Secret chỉ nằm trên Render, còn MongoDB lưu secure URL của ảnh để hình vẫn tồn tại sau khi service khởi động lại.

Nếu dùng MongoDB Atlas, cho phép kết nối từ Render trong mục Network Access.
