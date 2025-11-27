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
import LearningGoal from '../pages/LearningGoal.jsx';
import AIChat from '../pages/AIChat.jsx';
import Parents from '../pages/Parents.jsx';
import FeedbackListPage from '../pages/FeedbackListPage.jsx';
import FeedbackDetailPage from '../pages/FeedbackDetailPage.jsx';
import ChatListPage from '../pages/ChatListPage.jsx';
import ChatDetailPage from '../pages/ChatDetailPage.jsx';
import SettingPage from '../pages/SettingPage.jsx';
import EditChildPage from '../pages/EditChildPage.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DefaultLayout />,
    children: [
      // --- 1. 로그인 안 한 사용자 ---
      {
        element: <GuestLayout />,
        children: [
          { index: true, element: <Home /> },
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
              { path: 'goal', element: <LearningGoal /> },
              { path: 'intro', element: <AIChat /> },
              { path: 'dialogue', element: <AIChat /> },
              { path: 'card', element: <AIChat /> },
            ],
          },
          // 부모 관련 페이지 경로 설정
          {
            path: 'parents', // 부모 페이지 메인
            element: <Parents />,
          },
          {
            path: 'parents/settings', // 부모 페이지 설정
            element: <SettingPage />,
          },
          {
            path: 'parents/settings/edit-child', 
            element: <EditChildPage />, 
          },
          {
            path: 'parents/feedback', // 피드백 목록
            element: <FeedbackListPage />,
          },
          {
            // 특정 피드백 상세 보기
            path: 'parents/feedback/:conversationId',
            element: <FeedbackDetailPage />,
          },
          {
            path: 'parents/chat', // 대화 목록
            element: <ChatListPage />,
          },
          {
            // 특정 대화 상세 보기
            path: 'parents/chat/:conversationId',
            element: <ChatDetailPage />,
          },
        ],
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