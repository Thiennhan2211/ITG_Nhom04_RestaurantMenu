# Deploy lên Render

Repository có sẵn Blueprint tại `render.yaml`. Blueprint build cả hai giao diện React và chạy chúng cùng Express API trên một Web Service; URL của dịch vụ sẽ tự được dùng cho link và QR bàn.

1. Đẩy repository lên GitHub hoặc GitLab.
2. Trên Render, chọn **New → Blueprint** và kết nối repository này.
3. Khi Render hỏi `MONGODB_URI`, nhập MongoDB connection string của nhà hàng. `JWT_SECRET` được Render tự tạo.
4. Điền `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` và `CLOUDINARY_API_SECRET` từ **Cloudinary Console → Settings → API Keys**. Không đưa API Secret vào mã giao diện hoặc GitHub.
5. `CLOUDINARY_UPLOAD_FOLDER` đã đặt thành `QR-menu/products`, theo thư mục bạn tạo trong Dynamic folders.
6. Deploy service `van-lang-restaurant-menu`.

Sau khi deploy, trang thực đơn khách là URL gốc của service. Trang quản trị là `/admin/login`; màn lễ tân là `/admin/reception`. Mở từng bàn trong màn lễ tân rồi chọn **Link & mã QR** để xem hoặc in thẻ QR. Link QR lấy host hiện tại nên sau deploy sẽ chứa URL `onrender.com` thay vì `localhost`.

Nếu MongoDB Atlas đang giới hạn IP truy cập, hãy cấu hình Network Access để cho phép kết nối từ Render trước khi deploy.

Trong quản trị, chọn ảnh JPG, PNG hoặc WebP tối đa 8 MB rồi lưu món. Backend kiểm tra quyền admin và loại/kích thước tệp, sau đó tải ảnh vào `asset_folder` `QR-menu/products` trên Cloudinary bằng API Secret lưu trong biến môi trường Render. Cơ sở dữ liệu chỉ lưu secure URL của ảnh nên ảnh vẫn tồn tại sau khi Render khởi động lại.
