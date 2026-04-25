## 📱 UITVibes Microservices (In development)
UITVibes là một nền tảng mạng xã hội được xây dựng trên kiến trúc Microservices hiện đại, sử dụng .NET 8 và .NET Aspire để tối ưu hóa việc phát triển và triển khai.

---

## ✨ Features

### Người dùng & xác thực

* Đăng ký, đăng nhập và xác thực bằng JWT.
* Quản lý hồ sơ người dùng: avatar, bio và thông tin cá nhân.
* Theo dõi / bỏ theo dõi người dùng khác.

### Nội dung mạng xã hội

* Tạo và quản lý bài đăng (post) trên newfeed.
* Tương tác với bài đăng: bình luận và thảo luận cộng đồng.
* Story ngắn hạn với khả năng xem theo nhóm người dùng.

### Nhắn tin & thông báo

* Nhắn tin theo hội thoại thời gian thực (SignalR).
* Đồng bộ trạng thái hoạt động và cập nhật tin nhắn realtime.
* Hệ thống thông báo cho các sự kiện trong ứng dụng.

### Hạ tầng & khả năng mở rộng

* Kiến trúc Microservices tách biệt theo domain.
* API Gateway điều phối và định tuyến request tập trung.
* Redis caching để tối ưu hiệu năng truy xuất.
* RabbitMQ cho giao tiếp bất đồng bộ giữa các service.
* Tích hợp Cloudinary để lưu trữ và xử lý hình ảnh.

---

## 🛠️ Tech Stack

## Sơ đồ:
<img width="968" height="522" alt="download" src="https://github.com/user-attachments/assets/959277fa-078f-4e84-9f5d-8c31eb8a00e7" />

### Frontend

* ReactNative
* JavaScript (ES6+)

### Backend

* .NET 8.0 & ASP.NET Core API
* .NET Aspire

### Database

* PostgreSQL

### DevOps & Infrastructure

* Docker
* Redis (Caching, Session, Queue)
* RabbitMQ (Được sử dụng để giải quyết vấn đề giao tiếp bất đồng bộ giữa các dịch vụ)
* SignalR 
* Cloudinary 
* MailtKit
* YARP (Yet Another Reverse Proxy)

---


## 🏗️ Kiến trúc hệ thống (Architecture)
Dự án được chia thành các dịch vụ riêng biệt nhằm đảm bảo tính mở rộng:

- AuthService: Quản lý xác thực và phân quyền người dùng bằng JWT.

- UserService: Quản lý thông tin hồ sơ người dùng, tìm kiếm người dùng, lượt follow. Tích hợp Cloudinary để xử lý hình ảnh.

- PostService: Quản lý newfeed, các bài đăng, story, comment và cộng đồng.

- MessageService: Quản lý các đoạn hội thoại, tin nhắn và trạng thái hoạt động realtime.

-NoficationService: Quản lý các thông báo trong hệ thống. 

- ApiService: Đóng vai trò là API Gateway, điều phối và định tuyến các yêu cầu đến các service tương ứng.

----

## 📋 Yêu cầu hệ thống (Prerequisites)
Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:

- .NET 8 SDK (Phiên bản 8.0 trở lên)

- Docker Desktop (Đang chạy)

- Visual Studio 2022 hoặc VS Code

- Git

🚀 Cài đặt nhanh (Quick Start)
# 1. Sao chép kho lưu trữ

- git clone https://github.com/your-username/UITVibes-Microservices.git

# 2. Thiết lập tài khoản Cloudinary
Để quản lý hình ảnh, bạn cần đăng ký tài khoản tại Cloudinary và lấy các thông tin sau:

- Cloud Name

- API Key

- API Secret

# 3. Cấu hình User Secrets
Tất cả các thông tin bảo mật được quản lý tập trung trong dự án AppHost thông qua .NET User Secrets.

- Di chuyển vào thư mục dự án AppHost: 
cd UITVibes-Microservices.AppHost

- Khởi tạo user secrets: 
dotnet user-secrets init

- Thiết lập JWT Key (tối thiểu 32 ký tự): 
dotnet user-secrets set "Parameters:jwt-key" "YourSuperSecretKeyThatIsAtLeast32CharactersLong!@#$%"

- Thiết lập thông tin Cloudinary (thay thế bằng thông tin của bạn):

dotnet user-secrets set "Parameters:cloudinary-cloudname" "your-cloudname"

dotnet user-secrets set "Parameters:cloudinary-apikey" "your-api-key"

dotnet user-secrets set "Parameters:cloudinary-apisecret" "your-api-secret"

# 4. Chạy ứng dụng
Mở solution bằng Visual Studio hoặc chạy lệnh sau tại thư mục gốc: dotnet run --project UITVibes-Microservices.AppHost

Lưu ý: Đảm bảo Docker Desktop đang chạy vì .NET Aspire sẽ tự động khởi tạo các container cho PostgreSQL, Redis và RabbitMQ.




🎨 Setup & chạy Frontend (Expo React Native)
Frontend của UITVibes nằm trong thư mục `frontend/`, sử dụng Expo Router + React Native.

📋 Yêu cầu thêm cho Frontend
Trước khi chạy frontend, hãy đảm bảo đã cài đặt:

- Node.js LTS (khuyến nghị 20.x trở lên)

- npm (đi kèm Node.js)

- Expo Go trên điện thoại (nếu muốn chạy trên thiết bị thật)

- Android Studio Emulator hoặc iOS Simulator (tùy nền tảng)


🚀 Chạy nhanh Frontend
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài dependencies
npm install

# 3. Cấu hình biến môi trường
Tạo/cập nhật file `.env` trong thư mục `frontend`:

EXPO_PUBLIC_API_URL="http://localhost:5512"

Ghi chú:

- `5512` là port của API Gateway (`UITVibes-Microservices.ApiService`).

- Nếu chạy app trên điện thoại thật, hãy thay `localhost` bằng LAN IP của máy chạy backend. Ví dụ:
EXPO_PUBLIC_API_URL="http://192.168.1.10:5512"

- Không dùng port PostgreSQL (`5432`) cho frontend API.


# 4. Khởi động frontend
npm run start

Sau khi chạy lệnh trên, Expo Dev Tools sẽ hiển thị QR để mở bằng Expo Go hoặc các phím tắt:

- `a`: mở Android emulator

- `i`: mở iOS simulator (chỉ macOS)

- `w`: chạy bản web


# 5. Chạy trực tiếp theo nền tảng (tùy chọn)

- Android: npm run android

- iOS: npm run ios

- Web: npm run web


🔗 Thứ tự chạy đề xuất (fullstack local)

1. Chạy backend bằng AppHost (`dotnet run --project UITVibes-Microservices.AppHost`)

2. Kiểm tra `.env` của frontend trỏ đúng API Gateway

3. Chạy frontend bằng `npm run start`
