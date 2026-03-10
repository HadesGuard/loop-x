# Authentication Flow Review - Backend, Frontend & Integration

## 📋 Tổng quan (Overview)

Tài liệu này review toàn bộ luồng xác thực (authentication flow) của hệ thống Loop, bao gồm:
- Backend (BE) authentication implementation
- Frontend (FE) authentication implementation  
- Integration giữa BE và FE
- Các vấn đề và đề xuất cải thiện

---

## 🔐 Backend Authentication Flow

### 1. Authentication Service (`loop-backend/src/services/auth.service.ts`)

#### ✅ Điểm mạnh:
- **Password Security**: Sử dụng hash password với bcrypt
- **Token Management**: Hỗ trợ Access Token và Refresh Token
- **Multiple Auth Methods**: 
  - Traditional (email/password)
  - OAuth (Google, Apple)
  - Wallet authentication (Aptos, Ethereum, Solana)
- **Account Status Check**: Kiểm tra `isActive` trước khi login
- **Refresh Token Storage**: Lưu refresh token trong database với expiration

#### ⚠️ Vấn đề cần lưu ý:

1. **Refresh Token Rotation**: 
   - Hiện tại refresh token được UPDATE thay vì tạo mới khi refresh
   - Nên implement token rotation để tăng security
   ```149:207:loop-backend/src/services/auth.service.ts
   async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
     // ... code ...
     await prisma.refreshToken.update({
       where: { id: tokenRecord.id },
       data: {
         token: newRefreshToken,
         expiresAt,
       },
     });
   ```

2. **Remember Me Logic**:
   - Login có hỗ trợ `rememberMe` (30 days vs 7 days)
   - Nhưng refresh token luôn set 7 days, không respect rememberMe
   ```120:122:loop-backend/src/services/auth.service.ts
   const expiresAt = new Date();
   expiresAt.setDate(expiresAt.getDate() + (data.rememberMe ? 30 : 7)); // 30 days if rememberMe, else 7 days
   ```

3. **Logout Implementation**:
   - Chỉ xóa refresh token, không invalidate access token
   - Access token vẫn valid cho đến khi expire
   ```209:219:loop-backend/src/services/auth.service.ts
   async logout(refreshToken: string, userId: string): Promise<void> {
     await prisma.refreshToken.deleteMany({
       where: {
         token: refreshToken,
         userId,
       },
     });
   }
   ```

### 2. Authentication Middleware (`loop-backend/src/middleware/auth.middleware.ts`)

#### ✅ Điểm mạnh:
- **Bearer Token Validation**: Kiểm tra format `Bearer <token>`
- **Token Verification**: Verify access token với JWT_SECRET
- **Error Handling**: Proper error handling với AppError

#### ⚠️ Vấn đề:
- **No Token Refresh on 401**: Middleware không tự động refresh token khi expired
- **No Rate Limiting**: Không có rate limiting cho authentication endpoints

### 3. Authentication Routes (`loop-backend/src/routes/auth.routes.ts`)

#### ✅ Điểm mạnh:
- **Validation Middleware**: Sử dụng validation middleware cho tất cả endpoints
- **Route Organization**: Routes được tổ chức rõ ràng
- **Multiple Auth Methods**: Hỗ trợ traditional, OAuth, và wallet auth

#### Routes:
- `POST /auth/register` - Đăng ký
- `POST /auth/login` - Đăng nhập
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Đăng xuất (requires auth)
- `POST /auth/google` - Google OAuth
- `POST /auth/apple` - Apple OAuth
- `POST /auth/wallet/nonce` - Generate nonce cho wallet
- `POST /auth/wallet/verify` - Verify wallet signature

---

## 🎨 Frontend Authentication Flow

### 1. API Client (`loop-ui/lib/api/api.ts`)

#### ✅ Điểm mạnh:
- **Token Management**: Tự động thêm Bearer token vào headers
- **401 Handling**: Tự động clear token và redirect khi 401
- **WebSocket Integration**: Tự động connect WebSocket sau login
- **Error Handling**: Proper error handling với user-friendly messages

#### ⚠️ Vấn đề:

1. **No Automatic Token Refresh**:
   - Khi access token expired, chỉ redirect về login
   - Không tự động thử refresh token trước
   ```69:82:loop-ui/lib/api/api.ts
   // Handle 401 - Unauthorized
   if (response.status === 401) {
     this.clearToken();
     // Disconnect WebSocket
     if (typeof window !== 'undefined') {
       const { wsClient } = await import('./websocket');
       wsClient.disconnect();
       // Only redirect if we're not already on login page to avoid loops
       if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
         window.location.href = '/login';
       }
     }
     throw new Error('Unauthorized - Please login again');
   }
   ```

2. **Refresh Token Not Stored**:
   - Frontend không lưu refresh token
   - Không thể tự động refresh khi access token expired
   ```112:120:loop-ui/lib/api/api.ts
   if (response.success && response.data) {
     this.setToken(response.data.token);
     if (typeof window !== 'undefined') {
       localStorage.setItem('user_data', JSON.stringify(response.data.user));
       // Connect WebSocket after successful login
       const { wsClient } = await import('./websocket');
       wsClient.connect(response.data.token);
     }
     return response.data;
   }
   ```

3. **No Token Expiration Check**:
   - Không check token expiration trước khi gọi API
   - Chỉ phát hiện khi server trả về 401

### 2. useAuth Hook (`loop-ui/hooks/useAuth.ts`)

#### ✅ Điểm mạnh:
- **State Management**: Quản lý auth state với React hooks
- **Auto Check on Mount**: Tự động check auth khi component mount
- **Fallback to API**: Nếu không có user_data, gọi API để lấy

#### ⚠️ Vấn đề:

1. **Token Validation**:
   - Chỉ check token existence, không validate expiration
   ```24:33:loop-ui/hooks/useAuth.ts
   const token = localStorage.getItem('auth_token');
   if (token) {
     const userData = localStorage.getItem('user_data');
     if (userData) {
       const user = JSON.parse(userData);
       setAuthState({
         user,
         isAuthenticated: true,
         isLoading: false,
       });
   ```

2. **No Refresh Token Logic**:
   - Hook không có logic để refresh token
   - `refreshUser` chỉ refresh user data, không refresh token

### 3. Login/Signup Pages

#### ✅ Điểm mạnh:
- **UI/UX**: Modern, responsive design
- **Multiple Auth Methods**: Hỗ trợ traditional, Google, Apple
- **Form Validation**: Client-side validation
- **Error Handling**: Toast notifications cho errors

#### ⚠️ Vấn đề:

1. **OAuth Redirect**:
   - OAuth redirect trực tiếp đến backend, không có callback handling
   ```40:51:loop-ui/app/login/page.tsx
   const handleGoogleLogin = async () => {
     setIsLoading(true)
     try {
       // Google OAuth - redirect to backend OAuth endpoint
       const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
       window.location.href = `${backendUrl}/auth/google`
     } catch (error) {
       console.error("Google login error:", error)
       toast.error("Failed to initiate Google login")
       setIsLoading(false)
     }
   }
   ```

2. **Demo Login**:
   - Demo login không gọi API, chỉ set localStorage
   - Có thể gây confusion trong production
   ```66:83:loop-ui/app/login/page.tsx
   const handleDemoLogin = async () => {
     setIsLoading(true)
     await new Promise((resolve) => setTimeout(resolve, 1000))

     // Set auth token in localStorage
     localStorage.setItem("auth_token", "demo_user_token")
     localStorage.setItem(
       "user_data",
       JSON.stringify({
         username: "demo_user",
         email: "demo@loop.com",
         fullName: "Demo User",
       }),
     )
   ```

---

## 🔗 Integration Points

### 1. Token Flow

```
Frontend                    Backend
   |                           |
   |-- POST /auth/login ------>|
   |                           |-- Validate credentials
   |                           |-- Generate tokens
   |<-- {token, refreshToken}--|
   |                           |
   |-- Store token in localStorage
   |-- Add to Authorization header
   |                           |
   |-- API Request with token->|
   |                           |-- Verify token
   |<-- Response -------------|
```

### 2. WebSocket Integration

- WebSocket tự động connect sau khi login thành công
- Token được gửi trong auth object khi connect
- Disconnect khi logout hoặc 401

### 3. Current Issues in Integration

1. **Token Refresh Flow Missing**:
   - Không có automatic token refresh
   - User phải login lại khi token expired

2. **Refresh Token Not Used**:
   - Backend trả về refreshToken nhưng FE không lưu
   - Không thể implement refresh flow

3. **OAuth Callback Missing**:
   - OAuth redirect đến backend nhưng không có callback handling ở FE

---

## 🚨 Critical Issues & Recommendations

### 🔴 Critical Issues

1. **No Automatic Token Refresh**
   - **Impact**: User bị logout khi token expired, dù refresh token vẫn valid
   - **Fix**: Implement automatic token refresh trong API client

2. **Refresh Token Not Stored in Frontend**
   - **Impact**: Không thể refresh token khi cần
   - **Fix**: Store refreshToken trong localStorage (hoặc httpOnly cookie)

3. **OAuth Callback Not Handled**
   - **Impact**: OAuth flow không hoàn chỉnh
   - **Fix**: Implement OAuth callback handler ở FE

### 🟡 Medium Priority Issues

1. **Token Expiration Not Checked**
   - **Fix**: Check token expiration trước khi gọi API
   - **Fix**: Implement token refresh interceptor

2. **No Token Rotation**
   - **Fix**: Implement refresh token rotation trong backend

3. **Logout Doesn't Invalidate Access Token**
   - **Fix**: Implement token blacklist hoặc shorter expiration

4. **Remember Me Not Respected in Refresh**
   - **Fix**: Store rememberMe flag và respect khi refresh

### 🟢 Low Priority Improvements

1. **Rate Limiting**: Add rate limiting cho auth endpoints
2. **Token Validation**: Validate token format trước khi gọi API
3. **Better Error Messages**: More specific error messages
4. **Security Headers**: Add security headers cho auth endpoints

---

## 📝 Recommended Implementation Plan

### Phase 1: Fix Critical Issues

1. **Store Refresh Token in Frontend**
   ```typescript
   // In api.ts login/register methods
   if (response.success && response.data) {
     this.setToken(response.data.token);
     this.setRefreshToken(response.data.refreshToken); // NEW
     // ...
   }
   ```

2. **Implement Automatic Token Refresh**
   ```typescript
   // In api.ts request method
   private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
     // ... existing code ...
     
     if (response.status === 401) {
       // Try to refresh token
       const refreshed = await this.tryRefreshToken();
       if (refreshed) {
         // Retry original request
         return this.request(endpoint, options);
       }
       // If refresh failed, redirect to login
       this.clearToken();
       // ... redirect logic ...
     }
   }
   
   private async tryRefreshToken(): Promise<boolean> {
     const refreshToken = this.getRefreshToken();
     if (!refreshToken) return false;
     
     try {
       const result = await this.refreshToken(refreshToken);
       this.setToken(result.token);
       this.setRefreshToken(result.refreshToken);
       return true;
     } catch {
       return false;
     }
   }
   ```

3. **Implement OAuth Callback Handler**
   ```typescript
   // Create app/oauth/callback/page.tsx
   // Handle OAuth redirects from backend
   ```

### Phase 2: Security Improvements

1. **Token Rotation**: Update refresh token logic
2. **Token Blacklist**: Implement blacklist cho logout
3. **Rate Limiting**: Add rate limiting middleware

### Phase 3: UX Improvements

1. **Token Expiration Warning**: Warn user before token expires
2. **Better Error Messages**: More specific error handling
3. **Loading States**: Better loading states during auth

---

## ✅ Testing Checklist

- [ ] Login với email/password
- [ ] Register new user
- [ ] Login với OAuth (Google, Apple)
- [ ] Login với Wallet
- [ ] Token refresh khi expired
- [ ] Logout và clear tokens
- [ ] 401 handling và redirect
- [ ] WebSocket connection với token
- [ ] Remember me functionality
- [ ] Multiple tabs/token sync

---

## 📚 Related Files

### Backend:
- `loop-backend/src/services/auth.service.ts`
- `loop-backend/src/controllers/auth.controller.ts`
- `loop-backend/src/routes/auth.routes.ts`
- `loop-backend/src/middleware/auth.middleware.ts`
- `loop-backend/src/utils/jwt.ts`

### Frontend:
- `loop-ui/lib/api/api.ts`
- `loop-ui/hooks/useAuth.ts`
- `loop-ui/app/login/page.tsx`
- `loop-ui/app/signup/page.tsx`
- `loop-ui/lib/api/websocket.ts`

---

## 📅 Review Date
Generated: 2024

