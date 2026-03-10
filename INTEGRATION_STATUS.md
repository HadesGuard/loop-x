# 🔌 Frontend-Backend Integration Status

## ❌ Current Status: NOT INTEGRATED

### Frontend (loop-ui)
- **Location:** `/loop-ui`
- **Framework:** Next.js
- **API Client:** Using `mock-api.ts` (mock data)
- **Status:** ❌ Not connected to backend

### Backend (loop-backend)
- **Location:** `/loop-backend`
- **Framework:** Express.js + TypeScript
- **Running:** ✅ Yes (port 3000)
- **CORS:** ✅ Configured for `http://localhost:3001`
- **Status:** ✅ Ready for integration

---

## 📋 What Needs to Be Done

### 1. Create Real API Client
- [ ] Create `lib/api/api.ts` to replace `mock-api.ts`
- [ ] Configure API base URL (`http://localhost:3000`)
- [ ] Add authentication token handling
- [ ] Add error handling and retry logic

### 2. Update Authentication
- [ ] Replace demo login with real API call
- [ ] Implement JWT token storage
- [ ] Add token refresh logic
- [ ] Update OAuth flows (Google, Apple)
- [ ] Add wallet authentication

### 3. Update API Calls
Replace all `mockApi` calls with real API:
- [ ] Video feed (`GET /feed`)
- [ ] Video details (`GET /videos/:id`)
- [ ] Comments (`GET /videos/:id/comments`, `POST /videos/:id/comments`)
- [ ] Interactions (like, save, share)
- [ ] User profile (`GET /users/:username`)
- [ ] Notifications (`GET /notifications`)
- [ ] Messages (`GET /conversations`, `POST /conversations/:id/messages`)
- [ ] Search (`GET /search`)
- [ ] Upload video (`POST /videos`)

### 4. Environment Configuration
- [ ] Add `NEXT_PUBLIC_API_URL=http://localhost:3000` to `.env.local`
- [ ] Update CORS in backend if needed

### 5. WebSocket Integration
- [ ] Connect to WebSocket server (`ws://localhost:3000/socket.io`)
- [ ] Handle real-time notifications
- [ ] Handle real-time messages

---

## 🚀 Quick Integration Steps

### Step 1: Create API Client

Create `loop-ui/lib/api/api.ts`:

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, password: string) {
    const data = await this.request<{ data: { token: string; user: any } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    return data.data;
  }

  // Video methods
  async getVideosFeed(type: 'foryou' | 'following', page = 1, limit = 10) {
    const endpoint = type === 'foryou' ? '/feed' : '/feed/following';
    const data = await this.request<{ data: { videos: any[] } }>(
      `${endpoint}?page=${page}&limit=${limit}`
    );
    return data.data.videos;
  }

  // ... more methods
}

export const api = new ApiClient(API_BASE_URL);
```

### Step 2: Update Login Page

Replace mock login in `app/login/page.tsx`:

```typescript
import { api } from '@/lib/api/api';

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const result = await api.login(email, password);
    localStorage.setItem('auth_token', result.token);
    localStorage.setItem('user_data', JSON.stringify(result.user));
    window.location.href = '/';
  } catch (error) {
    toast.error('Login failed', { description: error.message });
  } finally {
    setIsLoading(false);
  }
};
```

### Step 3: Replace Mock API Calls

In all pages, replace:
```typescript
import { mockApi } from '@/lib/api/mock-api';
```

With:
```typescript
import { api } from '@/lib/api/api';
```

---

## 📝 Environment Variables

Add to `loop-ui/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## ✅ Integration Checklist

- [ ] Create real API client
- [ ] Update authentication flows
- [ ] Replace all mock API calls
- [ ] Test all endpoints
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test WebSocket connection
- [ ] Update CORS if needed

---

## 🎯 Priority Order

1. **HIGH:** Authentication (login, register, token management)
2. **HIGH:** Video feed and video details
3. **MEDIUM:** Comments and interactions
4. **MEDIUM:** User profile and settings
5. **LOW:** Notifications and messages
6. **LOW:** Search and discovery

---

**Ready to integrate? Start with Step 1!** 🚀

