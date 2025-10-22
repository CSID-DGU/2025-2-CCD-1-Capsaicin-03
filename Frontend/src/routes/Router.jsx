// src/routes/Router.jsx
import { createBrowserRouter } from 'react-router-dom';

// 1. 레이아웃 컴포넌트
import DefaultLayout from '../layouts/DefaultLayout';
import PrivateRoute from '../layouts/PrivateRoute';
import GuestLayout from '../layouts/GuestLayout';

// 2. 페이지 컴포넌트
import Home from '../pages/Home.jsx';
import Login from '../pages/Login.jsx';
import ProfileSetup from '../pages/ProfileSetup.jsx';
import StoryList from '../pages/StoryList.jsx';
import StoryPage from '../pages/StoryPage.jsx';
import AIChat from '../pages/AIChat.jsx';
import Parents from '../pages/Parents.jsx';
import FeedbackListPage from '../pages/FeedbackListPage.jsx';
import FeedbackDetailPage from '../pages/FeedbackDetailPage.jsx';
import ChatListPage from '../pages/ChatListPage.jsx';
import ChatDetailPage from '../pages/ChatDetailPage.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DefaultLayout />,
    children: [
      // --- 1. 로그인 안 한 사용자 ---
      {
        element: <GuestLayout />,
        children: [
          { path: 'login', element: <Login /> },
        ],
      },
      // --- 2. 로그인 한 사용자 ---
      {
        element: <PrivateRoute />,
        children: [
          { path: 'setup', element: <ProfileSetup /> },
          { path: 'stories', element: <StoryList /> },
          { path: 'story/:storyId', element: <StoryPage /> },
          {
            path: 'chat/:storyId',
            children: [
              { path: 'intro', element: <AIChat /> },
              { path: 'dialogue', element: <AIChat /> },
              { path: 'card', element: <AIChat /> },
            ],
          },
          // ✨ 부모 관련 페이지 경로 설정
          {
            path: 'parents', // 부모 페이지 메인 ('/parents')
            element: <Parents />,
          },
          {
            path: 'parents/feedback', // 피드백 목록 ('/parents/feedback')
            element: <FeedbackListPage />,
          },
          {
            // 특정 피드백 상세 보기 ('/parents/feedback/heungbu-nolbu')
            path: 'parents/feedback/:storyId',
            element: <FeedbackDetailPage />,
          },
          {
            path: 'parents/chat', // 대화 목록 ('/parents/chat')
            element: <ChatListPage />,
          },
          {
            // 특정 대화 상세 보기 ('/parents/chat/heungbu-nolbu')
            path: 'parents/chat/:storyId',
            element: <ChatDetailPage />,
          },
        ],
      },
      // --- 3. 공통 경로 ---
      {
        index: true, // 홈 ('/')
        element: <Home />,
      },
      // --- 4. 404 페이지 ---
      {
        path: '*',
        element: (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <h1>404: 페이지를 찾을 수 없습니다</h1>
            <p>잘못된 경로입니다.</p>
          </div>
        ),
      },
    ],
  },
]);

export default router;