# 📱 UITVibes - Nền Tảng Mạng Xã Hội Hiện Đại

Một nền tảng mạng xã hội phân tán hiện đại được xây dựng trên kiến trúc Microservices tiên tiến, sử dụng .NET 8, .NET Aspire và React Native.

---

## 📋 Mục Lục
- [Tổng Quan](#-tổng-quan)
- [Tính Năng](#-tính-năng)
- [Kiến Trúc](#-kiến-trúc)
- [Microservices](#-microservices)
- [Tech Stack](#-tech-stack)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Khởi Động Nhanh](#-khởi-động-nhanh)
- [Lược Đồ Cơ Sở Dữ Liệu](#-lược-đồ-cơ-sở-dữ-liệu)
- [Tài Liệu API](#-tài-liệu-api)
- [Triển Khai](#-triển-khai)

---

## 🎯 Tổng Quan

UITVibes là một nền tảng mạng xã hội có khả năng mở rộng cao với các tính năng giao tiếp thời gian thực. Nó thể hiện các mẫu microservices cấp độ doanh nghiệp, kiến trúc hướng sự kiện và khả năng giao tiếp real-time.

---

## ✨ Tính Năng

### 👥 Quản Lý Người Dùng & Xác Thực
- ✅ Đăng ký với xác thực email
- ✅ Xác thực bằng JWT & phân quyền
- ✅ Quản lý hồ sơ người dùng (avatar, ảnh bìa, tiểu sử)
- ✅ Theo dõi/bỏ theo dõi
- ✅ Chặn/bỏ chặn người dùng
- ✅ Tìm kiếm & khám phá người dùng
- ✅ Bảo mật tài khoản
- ✅ Vai trò quản trị viên
- ✅ Hệ thống cấm người dùng

### 📝 Nội Dung & Tính Năng Xã Hội
- ✅ Tạo bài đăng với văn bản & media
- ✅ Kiểm soát hiển thị (Công khai/Người theo dõi/Riêng tư)
- ✅ Thích, bình luận, chia sẻ lại
- ✅ Stories tạm thời (mất sau 24h)
- ✅ Highlights - lưu stories thành bộ sưu tập
- ✅ Reels - video ngắn
- ✅ Hashtags & @ mentions
- ✅ Lưu bài đăng
- ✅ Báo cáo bài đăng & kiểm duyệt nội dung
- ✅ Bình luận có cấu trúc theo chuỗi

### 💬 Nhắn Tin Thời Gian Thực
- ✅ Trò chuyện riêng 1:1
- ✅ Nhắn tin nhóm
- ✅ Gửi tin nhắn thời gian thực
- ✅ Theo dõi trạng thái hoạt động
- ✅ Xác nhận đã đọc tin nhắn
- ✅ Lưu lịch sử tin nhắn
- ✅ Chỉ báo đang gõ
- ✅ Media trong tin nhắn

### 🔔 Thông Báo
- ✅ Thông báo trong ứng dụng real-time
- ✅ Thông báo đẩy qua Firebase
- ✅ Thông báo dựa trên sự kiện
- ✅ Tùy chỉnh thông báo của người dùng
- ✅ Lịch sử & quản lý thông báo
- ✅ Gửi tin cậy

### 🏗️ Hạ Tầng & Khả Năng Mở Rộng
- ✅ Kiến trúc Microservices
- ✅ API Gateway điều phối
- ✅ Redis cache & quản lý phiên
- ✅ RabbitMQ nhắn tin bất đồng bộ
- ✅ Khám phá service
- ✅ Health checks
- ✅ Cloudinary lưu trữ media
- ✅ Docker
- ✅ Cơ sở dữ liệu riêng biệt

---

## 🛠️ Tech Stack
## Sơ đồ:
<img width="968" height="522" alt="download" src="https://github.com/user-attachments/assets/959277fa-078f-4e84-9f5d-8c31eb8a00e7" />

### Frontend
| Công Nghệ | Mục Đích |
|-----------|----------|
| **React Native (Expo v54)** | Framework di động đa nền tảng |
| **TypeScript** | JavaScript an toàn về kiểu |
| **Expo Router** | Đường dẫn dựa trên tập tin & điều hướng |
| **Axios** | HTTP client với interceptors |
| **SignalR Client** | Giao tiếp real-time WebSocket |
| **React Native Reanimated** | Animations hiệu năng |
| **Expo Vector Icons** | Thư viện biểu tượng |

### Backend
| Công Nghệ | Mục Đích |
|-----------|----------|
| **.NET 8 & ASP.NET Core** | Framework cho tất cả microservices |
| **.NET Aspire** | Orchestration phát triển địa phương |
| **Entity Framework Core** | ORM cho truy cập dữ liệu |
| **MediatR** | CQRS & domain events |
| **FluentValidation** | Xác thực đầu vào |
| **JWT Bearer** | Xác thực không trạng thái |

### Dữ Liệu & Hạ Tầng
| Công Nghệ | Mục Đích |
|-----------|----------|
| **PostgreSQL 16** | Cơ sở dữ liệu quan hệ chính (nhiều instance) |
| **Redis 7** | Cấi nhốm, phiên, xếp hàng |
| **RabbitMQ 3** | Mô hình tin nhắn, event bus |
| **SignalR** | Giao tiếp real-time WebSocket |
| **YARP** | API Gateway & reverse proxy |
| **Cloudinary** | Lưu trữ & tối ưu hóa media |
| **Firebase Admin SDK** | Thông báo đẩy (FCM) |
| **MailKit** | Gửi email qua SMTP |
| **Docker & Compose** | Containerization & orchestration |

---

## 🏗️ Kiến Trúc Hệ Thống

Dự án tuân theo mẫu microservices với Thiết kế hướng Miền (DDD), nơi mà mỗi service sở hữu cơ sở dữ liệu riêng và giao tiếp qua nhắn tin bất đồng bộ (RabbitMQ) hoặc gọi RPC đồng bộ.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React Native)                  │
│              iOS / Android / Web (Expo)                     │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS + WebSocket (SignalR)
                 │
┌────────────────▼────────────────────────────────────────────┐
│              API Gateway (YARP)                             │
│         Cổng 5000 - Điều phối Request & JWT Auth            │
└─┬──────────┬──────────┬──────────┬──────────┬───────────────┘
  │          │          │          │          │
┌─▼──┐  ┌───▼──┐  ┌────▼───┐ ┌───▼──┐  ┌────▼────┐
│Auth│  │User  │  │Post    │ │Message  │Notif   │
│5158│  │5016  │  │5078    │ │5240     │5091    │
└────┘  └──────┘  └────────┘ └────────┘ └─────────┘
  │        │        │          │         │
  └────────┴────────┼──────────┴─────────┘
                    │
        ┌───────────▼──────────┐
        │   PostgreSQL 16      │
        │  (5 Cơ sở dữ liệu)   │
        │ authdb, userdb,      │
        │ postdb, messagedb,   │
        │ notificationdb       │
        └──────────┬───────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
    ┌───▼────┐           ┌───▼────┐
    │ Redis  │           │RabbitMQ│
    │ 6379   │           │ 5672   │
    └────────┘           └────────┘
    (Cache,          (Event Bus,
     Sessions)        RPC Calls)
```

---

## 🔧 Tổng Quan Microservices

### 1. **AuthService** (Cổng 5158)
**Mục Đích**: Xác thực người dùng, đăng ký và phân quyền
- Đăng ký người dùng với xác thực email qua SMTP
- Tạo JWT token & refresh tokens
- Xác thực email với OTP
- Quản lý & thay đổi mật khẩu
- Quản lý vai trò quản trị viên
- Hệ thống cấm người dùng
- **Cơ sở dữ liệu**: PostgreSQL (`authdb`)
- **Các phụ thuộc chính**: RabbitMQ, Redis, SMTP, JWT

**Giao Tiếp**:
- 📤 Công bố: `UserRegistered`, `UserBanned` events
- 📥 Được tiêu thụ bởi: UserService, NotificationService

---

### 2. **UserService** (Cổng 5016)
**Mục Đích**: Hồ sơ người dùng, quan hệ xã hội và khám phá
- Quản lý hồ sơ người dùng (tên hiển thị, avatar, ảnh bìa, tiểu sử)
- Tải avatar/ảnh bìa qua Cloudinary
- Quan hệ theo dõi/bỏ theo dõi
- Chặn/bỏ chặn người dùng
- Tìm kiếm & khám phá người dùng
- Liên kết xã hội (hưởng ngoài)
- Số đằng ký theo dõi/tháng bạn & thống kê
- Xử lý báo cáo người dùng & lạm dụng
- **Cơ sở dữ liệu**: PostgreSQL (`userdb`)
- **Các phụ thuộc chính**: Cloudinary, RabbitMQ, gọi RPC đến các service khác

**Giao Tiếp**:
- 📤 Công bố: `UserFollowed`, `UserUnfollowed` events
- 📥 Tiêu thụ: `UserRegistered` (tạo hồ sơ)
- 🔄 RPC: Được PostService, MessageService gọi lấy thông tin người dùng

---

### 3. **PostService** (Cổng 5078)
**Mục Đích**: Quản lý nội dung (bài đăng, stories, reels, bình luận)
- Tạo, đọc, cập nhật, xóa bài đăng
- Kiểm soát hiển thị (Công khai / Chỉ người theo dõi / Riêng tư)
- Xử lý media qua Cloudinary (ảnh, video)
- Thích/bỏ thích bài đăng với theo dõi engagement
- Bình luận lồng nhau trên bài đăng
- Chức năng chia sẻ lại/đưa vào văn bản
- Stories (nội dung tạm thời, thị nhìn 24h)
- Story highlights (bộ sưu tập được lưu)
- Reels (nội dung video ngắn)
- Hashtags với phân tích xu hướng
- @ mentions & hệ thống tagging
- Lưu bài đăng - lưu bài đăng để xem sau
- Báo cáo bài đăng & các cột kỷ kiểm duyệt nội dung
- **Cơ sở dữ liệu**: PostgreSQL (`postdb`)
- **Các phụ thuộc chính**: Cloudinary, RabbitMQ, RPC đến UserService

**Giao Tiếp**:
- 📤 Công bố: `PostLiked`, `PostCommented`, `PostMentioned`, `CommentMentioned` events
- 📥 Tiêu thụ: Dữ liệu UserService qua RPC
- 🔄 RPC: Gọi UserService để lấy hồ sơ tác giả & trạng thái theo dõi

---

### 4. **MessageService** (Cổng 5240)
**Mục Đích**: Nhắn tin và trò chuyện thời gian thực
- Trò chuyện riêng 1:1 giữa các người dùng
- Nhắn tin nhóm (nhiều người nhận)
- Gửi tin nhắn thời gian thực qua SignalR (WebSockets)
- Theo dõi trạng thái có mặt/vắng
- Xác nhận đã đọc tin nhắn
- Lịch sử & lưu trữ tin nhắn
- Chỉ báo đang gõ
- Media trong tin nhắn
- Quản lý trò chuyện (tắn tiếng, lưu trữ, xóa)
- **Cơ sở dữ liệu**: PostgreSQL (`messagedb`)
- **Các phụ thuộc chính**: SignalR, RabbitMQ, Redis (để mở rộng)

**Giao Tiếp**:
- 📤 Công bố: `MessageSent` events
- 📥 Được tiêu thụ bởi: NotificationService
- 🔄 RPC: Lấy thông tin người dùng từ UserService

---

### 5. **NotificationService** (Cổng 5091)
**Mục Đích**: Thông báo đẩy và quản lý thông báo
- Tích hợp Firebase Cloud Messaging (FCM) để gửi thông báo
- Sự kiện thông báo trong ứng dụng
- Tùy chỉnh thông báo người dùng (điều khiển chi tiết theo sự kiện)
- Thông báo dựa trên sự kiện:
  - Người theo dõi mới
  - Thích bài đăng
  - Bình luận trên bài đăng
  - Nhắc đến @
  - Tin nhắn trực tiếp
- Gửi tin cậy sử dụng Outbox Pattern
- Lịch sử & quản lý thông báo
- **Cơ sở dữ liệu**: PostgreSQL (`notificationdb`)
- **Các phụ thuộc chính**: Firebase Admin SDK, RabbitMQ event consumers

**Giao Tiếp**:
- 📥 Tiêu thụ: Sự kiện từ AuthService, UserService, PostService, MessageService
- Công bố: Thông báo đẩy đến các thiết bị khách hàng

---

### 6. **ApiService (API Gateway)** (Cổng 5000)
**Mục Đích**: Điều phối request trung tâm, tổng hợp và xác thực
- YARP reverse proxy điều phối đến tất cả microservices
- Xác thực JWT tập trung & phân quyền
- Giới hạn tốc độ
- Khám phá service
- Tổng hợp tài liệu Swagger/OpenAPI
- Xử lý token chuỗi truy vấn SignalR
- Ghi nhật ký request/response
- Xử lý lỗi & chuẩn hóa mã trạng thái

**Bản Đồ Điều Phối**:
```
/auth/* → AuthService (5158)
/users/* → UserService (5016)
/posts/* → PostService (5078)
/messages/* → MessageService (5240) + SignalR hub
/notifications/* → NotificationService (5091)
```

---

## 💾 Lược Đồ Cơ Sở Dữ Liệu

### **AuthDB** (PostgreSQL)
- `Users`: Thông tin đăng nhập, vai trò, trạng thái xác thực, trạng thái cấm
- `RefreshTokens`: Theo dõi làm mới token

### **UserDB** (PostgreSQL)
- `UserProfiles`: Thông tin hiển thị, avatars, tiểu sử, số lượng
- `Follows`: Cặp người theo dõi-theo dõi
- `Blocks`: Cặp người dùng bị chặn
- `SocialLinks`: Liên kết hồ sơ bên ngoài
- `UserReports`: Báo cáo lạm dụng

### **PostDB** (PostgreSQL)
- `Posts`: Nội dung, media, hiển thị, số liệu engagement
- `Comments`: Cấu trúc bình luận lồng nhau
- `Likes`: Thích bài đăng & bình luận
- `Stories`: Nội dung tạm thời
- `StoryHighlights`: Bộ sưu tập stories được lưu
- `Reels`: Nội dung video ngắn
- `PostMedia`: Siêu dữ liệu ảnh/video với URL Cloudinary
- `Hashtags`: Theo dõi tag & xu hướng
- `Mentions`: Theo dõi nhắc đến người dùng
- `Bookmarks`: Bài đăng được lưu
- `PostReports`: Cột kỷ kiểm duyệt nội dung

### **MessageDB** (PostgreSQL)
- `Conversations`: Trò chuyện riêng/nhóm
- `Messages`: Nội dung tin nhắn, trạng thái đọc, dấu thời gian
- `ConversationMembers`: Tham gia người dùng

### **NotificationDB** (PostgreSQL)
- `Notifications`: Thông báo sự kiện
- `UserNotificationSettings`: Tùy chỉnh theo loại sự kiện
- `DeviceTokens`: Đăng ký thiết bị FCM

---

## 📂 Cấu Trúc Dự Án

```
UITVibes-Project/
├── Backend/
│   ├── UITVibes-Microservices.sln          # Visual Studio solution
│   ├── docker-compose.yml                  # Docker Compose cho hạ tầng
│   │
│   ├── UITVibes-Microservices.AppHost/     # .NET Aspire orchestrator
│   │   └── AppHost.cs                      # Phụ thuộc service & khởi động
│   │
│   ├── UITVibes-Microservices.ServiceDefaults/
│   │   └── Cấu hình chung service
│   │
│   ├── UITVibes-Microservices.ApiService/  # API Gateway (YARP)
│   │   ├── Program.cs
│   │   ├── route-metadata.json
│   │   └── Services/
│   │
│   ├── AuthService/                        # Microservice xác thực
│   │   ├── Program.cs
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Models/
│   │   ├── ServiceLayer/
│   │   ├── Migrations/                    # EF Core migrations
│   │   ├── Messaging/                     # RabbitMQ publishers
│   │   └── appsettings.json
│   │
│   ├── UserService/                        # Microservice hồ sơ người dùng
│   │   ├── Program.cs
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Models/
│   │   ├── ServiceLayer/
│   │   ├── Migrations/
│   │   ├── Messaging/
│   │   └── appsettings.json
│   │
│   ├── PostService/                        # Microservice quản lý nội dung
│   │   ├── Program.cs
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Models/
│   │   ├── ServiceLayer/
│   │   ├── Migrations/
│   │   ├── Messaging/
│   │   └── appsettings.json
│   │
│   ├── MessageService/                     # Microservice nhắn tin
│   │   ├── Program.cs
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Hubs/                          # SignalR hubs
│   │   ├── Models/
│   │   ├── ServiceLayer/
│   │   ├── Migrations/
│   │   ├── Messaging/
│   │   └── appsettings.json
│   │
│   ├── NotificationService/                # Microservice thông báo
│   │   ├── Program.cs
│   │   ├── Controllers/
│   │   ├── DTOs/
│   │   ├── Models/
│   │   ├── ServiceLayer/
│   │   ├── Migrations/
│   │   ├── Messaging/                     # RabbitMQ event consumers
│   │   └── appsettings.json
│   │
│   └── DbSeeder/                          # Tập lệnh khởi tạo cơ sở dữ liệu
│       ├── AuthDbSeeder.sql
│       ├── UserDbSeeder.sql
│       ├── PostDbSeeder.sql
│       ├── MessageDbSeeder.sql
│       └── (Những cái khác)
│
├── frontend/                               # Ứng dụng React Native (Expo)
│   ├── app/                               # Điều hướng dựa trên tập tin Expo Router
│   │   ├── _layout.tsx                   # Bố cục gốc & Auth guard
│   │   ├── (tabs)/                       # Màn hình điều hướng tab
│   │   │   ├── home.tsx
│   │   │   ├── search.tsx
│   │   │   ├── music.tsx
│   │   │   ├── profile.tsx
│   │   │   ├── message.tsx
│   │   │   └── reels.tsx
│   │   ├── auth/                         # Màn hình xác thực
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── (các luồng xác thực khác)
│   │   ├── post/                         # Màn hình chi tiết bài đăng
│   │   ├── profile/                      # Màn hình hồ sơ người dùng
│   │   └── (màn hình khác)
│   │
│   ├── components/                        # Các thành phần React có thể tái sử dụng
│   │   ├── Button.tsx
│   │   ├── PostCard.tsx
│   │   ├── CommentItem.tsx
│   │   ├── ModernTabBar.tsx
│   │   ├── AnimatedButton.tsx            # Thành phần động mới
│   │   ├── AnimatedModal.tsx
│   │   ├── EnhancedSkeletonLoader.tsx
│   │   ├── EnhancedToast.tsx
│   │   ├── PremiumHeader.tsx
│   │   └── (thêm thành phần)
│   │
│   ├── services/                         # Dịch vụ API
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── postService.ts
│   │   ├── messageService.ts
│   │   ├── notificationService.ts
│   │   └── signalrService.ts            # Dịch vụ WebSocket
│   │
│   ├── context/                          # React Context (quản lý trạng thái)
│   │   └── AppContext.tsx
│   │
│   ├── hooks/                            # Các hook React tùy chỉnh
│   │   ├── useMicroInteractions.ts      # Animation hooks
│   │   └── (các hook khác)
│   │
│   ├── utils/                            # Hàm tiện ích
│   ├── constants/                        # Hằng số ứng dụng
│   ├── types/                            # Loại TypeScript
│   ├── assets/                           # Ảnh, phông chữ
│   ├── animations/                       # Cấu hình animation
│   │
│   ├── package.json                      # Phụ thuộc npm
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── app.json                          # Cấu hình Expo
│   └── README.md
│
├── LICENSE
└── README.md                               # Tệp này

```

---

## 📋 Yêu Cầu Hệ Thống

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt:
- ✅ .NET 8 SDK (phiên bản 8.0+)
- ✅ Node.js (v18+) & npm/yarn
- ✅ Docker Desktop (đang chạy)
- ✅ Git
- ✅ Visual Studio 2022 / VS Code
- ✅ Expo CLI (cho frontend): `npm install -g expo-cli`

---

## 🚀 Khởi Động Nhanh

### Bước 1: Sao Chép Kho Lưu Trữ
```bash
git clone https://github.com/curyhao123/UITVibes-Microservices.git
cd UITVibes-Project
```

### Bước 2: Khởi Động Hạ Tầng (Docker Compose)
Khởi động PostgreSQL, Redis, và RabbitMQ:

```bash
cd Backend
docker-compose up -d
```

Điều này sẽ khởi động:
- PostgreSQL (cổng 5432)
- Redis (cổng 6379)
- RabbitMQ (cổng 5672, UI ở 15672)
- PgAdmin (cổng 5050)

### Bước 3: Thiết Lập Backend

#### Tùy Chọn A: Chạy với .NET Aspire (Khuyến Nghị)
```bash
cd Backend/UITVibes-Microservices.AppHost
dotnet run
```

Điều này sẽ tự động:
- Áp dụng migrations cho tất cả các cơ sở dữ liệu
- Khởi động tất cả 6 microservices
- Cấu hình service discovery
- Hiển thị thông tin endpoint

#### Tùy Chọn B: Chạy Từng Service
```bash
# Terminal 1: AuthService
cd Backend/AuthService
dotnet run

# Terminal 2: UserService
cd Backend/UserService
dotnet run

# Terminal 3: PostService
cd Backend/PostService
dotnet run

# Terminal 4: MessageService
cd Backend/MessageService
dotnet run

# Terminal 5: NotificationService
cd Backend/NotificationService
dotnet run

# Terminal 6: ApiService (API Gateway)
cd Backend/UITVibes-Microservices.ApiService
dotnet run
```

### Bước 4: Thiết Lập Frontend
```bash
cd frontend
npm install
# hoặc yarn install
```

### Bước 5: Chạy Frontend
```bash
# Cho iOS simulator (macOS chỉ)
expo start --ios

# Cho Android emulator
expo start --android

# Cho web browser
expo start --web

# Hoặc trực tiếp với npx
npx expo start
```

---

## 🔗 Tài Liệu API

### URL Cơ Bản
- **Phát Triển**: `http://localhost:5000` (thông qua API Gateway)
- **Direct Services**: Xem cổng microservice ở trên

### Xác Thực
Tất cả các endpoint (ngoại trừ `/auth/register`, `/auth/login`) yêu cầu token JWT:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" \
  http://localhost:5000/users/profile
```

### Các Endpoint Chính

#### 🔐 Auth Service
```
POST   /auth/register           # Đăng ký người dùng mới
POST   /auth/login              # Đăng nhập & lấy JWT
POST   /auth/refresh-token      # Làm mới JWT
POST   /auth/verify-email       # Xác thực email
POST   /auth/resend-otp         # Gửi lại OTP
POST   /auth/change-password    # Thay đổi mật khẩu
```

#### 👥 User Service
```
GET    /users/profile           # Lấy hồ sơ người dùng hiện tại
PUT    /users/profile           # Cập nhật hồ sơ
GET    /users/{userId}          # Lấy người dùng theo ID
GET    /users/search            # Tìm kiếm người dùng
POST   /users/{userId}/follow   # Theo dõi người dùng
DELETE /users/{userId}/follow   # Bỏ theo dõi người dùng
POST   /users/{userId}/block    # Chặn người dùng
DELETE /users/{userId}/block    # Bỏ chặn người dùng
GET    /users/{userId}/followers
GET    /users/{userId}/following
```

#### 📝 Post Service
```
GET    /posts                   # Lấy feed
POST   /posts                   # Tạo bài đăng
GET    /posts/{postId}          # Lấy chi tiết bài đăng
PUT    /posts/{postId}          # Cập nhật bài đăng
DELETE /posts/{postId}          # Xóa bài đăng
POST   /posts/{postId}/like     # Thích bài đăng
DELETE /posts/{postId}/like     # Bỏ thích bài đăng
GET    /posts/{postId}/comments # Lấy bình luận
POST   /posts/{postId}/comments # Thêm bình luận
GET    /posts/{postId}/likes    # Lấy danh sách thích
```

#### 💬 Message Service
```
GET    /messages/conversations  # Lấy tất cả trò chuyện
POST   /messages/conversations  # Tạo trò chuyện
GET    /messages/{conversationId}/messages # Lấy tin nhắn
POST   /messages/send           # Gửi tin nhắn
WebSocket /messages/hub         # Kết nối SignalR
```

#### 🔔 Notification Service
```
GET    /notifications           # Lấy thông báo
GET    /notifications/unread    # Lấy số lượng chưa đọc
PUT    /notifications/{id}/read # Đánh dấu đã đọc
POST   /devices/register        # Đăng ký token thiết bị FCM
DELETE /devices/{tokenId}       # Hủy đăng ký thiết bị
```

### Tài Liệu Swagger
Truy cập tài liệu API tương tác:
- **Cục Bộ**: http://localhost:5000/swagger/index.html

---

## 🐳 Docker & Triển Khai

### Dịch Vụ Docker Compose
```yaml
# PostgreSQL 16
postgres:
  ports: 5432
  databases: authdb, userdb, postdb, messagedb, notificationdb

# Redis 7
redis:
  ports: 6379

# RabbitMQ 3
rabbitmq:
  ports: 5672 (AMQP), 15672 (Management UI)
  default user: guest/guest

# PgAdmin
pgadmin:
  ports: 5050
  email: admin@example.com
```

### Xây Dựng Hình Ảnh Docker cho Microservices

```bash
# Mỗi microservice có Dockerfile cho triển khai sản xuất
cd Backend/AuthService
docker build -t uitvibes-authservice:latest .

# Xây dựng tất cả dịch vụ
for service in AuthService UserService PostService MessageService NotificationService; do
  docker build -t uitvibes-${service,,}:latest ./$service
done
```

### Docker Compose cho Sản Xuất
Tạo `docker-compose.prod.yml` với tất cả microservices:

```yaml
version: '3.8'
services:
  authservice:
    image: uitvibes-authservice:latest
    ports:
      - "5158:5158"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=http://+:5158
      # Thêm các biến env khác
  
  # Tương tự cho các dịch vụ khác...
```

---

## 🔄 Luồng Sự Kiện & Giao Tiếp

### Mẫu Công Bố Sự Kiện
Các dịch vụ công bố domain events tới RabbitMQ mà các dịch vụ khác tiêu thụ:

```
AuthService công bố:
  ├─ UserRegistered → (UserService, NotificationService tiêu thụ)
  └─ UserBanned

UserService công bố:
  ├─ UserFollowed → (NotificationService)
  └─ UserUnfollowed

PostService công bố:
  ├─ PostLiked → (NotificationService)
  ├─ PostCommented → (NotificationService)
  ├─ PostMentioned → (NotificationService)
  └─ CommentMentioned → (NotificationService)

MessageService công bố:
  └─ MessageSent → (NotificationService)

NotificationService tiêu thụ:
  └─ Tất cả sự kiện ở trên và gửi thông báo đẩy FCM
```

### Các Cuộc Gọi RPC (Đồng Bộ)
Một số dịch vụ gọi các dịch vụ khác một cách đồng bộ cho các hoạt động cụ thể:

```
PostService → UserService
  (Lấy hồ sơ tác giả, trạng thái theo dõi)

MessageService → UserService
  (Xác thực thành viên trò chuyện)
```

---

## 🧪 Kiểm Thử

### Backend Unit Tests
```bash
cd Backend
dotnet test
```

### Backend Integration Tests
```bash
# Đảm bảo Docker Compose đang chạy
dotnet test --configuration Integration
```

### Frontend E2E Tests
```bash
cd frontend
npm run test
```

---

## 📊 Giám Sát & Ghi Nhật Ký

### Health Checks
Mỗi dịch vụ công bố một endpoint health check:
```bash
curl http://localhost:5158/health    # AuthService
curl http://localhost:5016/health    # UserService
curl http://localhost:5078/health    # PostService
curl http://localhost:5240/health    # MessageService
curl http://localhost:5091/health    # NotificationService
```

### RabbitMQ Management UI
Giám sát hàng đợi tin nhắn và người tiêu thụ:
- URL: http://localhost:15672
- Tên người dùng: guest
- Mật khẩu: guest

### PostgreSQL qua PgAdmin
Truy vấn cơ sở dữ liệu trực tiếp:
- URL: http://localhost:5050
- Email: admin@example.com
- Mật khẩu: admin

---

## 🤝 Đóng Góp

1. Tạo nhánh tính năng: `git checkout -b feature/your-feature`
2. Cam kết thay đổi: `git commit -am 'Thêm tính năng mới'`
3. Đẩy đến nhánh: `git push origin feature/your-feature`
4. Gửi Pull Request

---

## 📄 Giấy Phép

Dự án này được cấp phép theo Giấy Phép MIT - xem tệp [LICENSE](LICENSE) để biết chi tiết.

---

## 📞 Hỗ Trợ & Liên Hệ

Để có câu hỏi, sự cố hoặc đề xuất:
- 📧 Email: support@uitvibes.com
- 🐛 Issues: [GitHub Issues](https://github.com/curyhao123/UITVibes-Microservices/issues)
- 💬 Discord: [Community Server](https://discord.gg/your-server)

---

## 🎉 Lời Cảm Ơn

- Nhóm .NET Aspire vì khung công tác orchestration
- Cộng đồng React Native & Expo
- Cộng đồng PostgreSQL, Redis, RabbitMQ

---

**Cập Nhật Lần Cuối**: Tháng 5 28, 2026
**Trạng Thái**: Đang Phát Triển Tích Cực
