📱 UITVibes Microservices
UITVibes là một nền tảng mạng xã hội được xây dựng trên kiến trúc Microservices hiện đại, sử dụng .NET 8 và .NET Aspire để tối ưu hóa việc phát triển và triển khai.

🏗️ Kiến trúc hệ thống (Architecture)
Dự án được chia thành các dịch vụ riêng biệt nhằm đảm bảo tính mở rộng:

- AuthService: Quản lý xác thực và phân quyền người dùng bằng JWT.

- UserService: Quản lý thông tin hồ sơ người dùng, tích hợp Cloudinary để xử lý hình ảnh.

- ApiService: Đóng vai trò là API Gateway, điều phối và định tuyến các yêu cầu đến các service tương ứng.

Infrastructure: Sử dụng các công nghệ mạnh mẽ:

- PostgreSQL: Cơ sở dữ liệu quan hệ.

- Redis: Caching giúp tăng tốc độ truy xuất.

- RabbitMQ: Message Broker cho giao tiếp bất đồng bộ giữa các dịch vụ.

📋 Yêu cầu hệ thống (Prerequisites)
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

# 4. Khởi động hạ tầng (Postgres, Redis, RabbitMQ)
Tại thư mục chứa `docker-compose.yml`:
docker compose up -d

Lưu ý: Đảm bảo Docker Desktop đang chạy vì .NET Aspire sẽ tự động khởi tạo các container cho PostgreSQL, Redis và RabbitMQ.


# 5. Chạy ứng dụng
Mở solution bằng Visual Studio hoặc chạy lệnh sau tại thư mục gốc: dotnet run --project UITVibes-Microservices.AppHost

Lưu ý: Đảm bảo Docker Desktop đang chạy vì .NET Aspire sẽ tự động khởi tạo các container cho PostgreSQL, Redis và RabbitMQ.
