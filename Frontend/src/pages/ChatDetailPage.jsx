import React from 'react';
import { useParams } from 'react-router-dom';

const ChatDetailPage = () => {
  const { storyId } = useParams();
  return (
    <div>
      <h1>대화 상세 페이지 (ChatDetailPage.jsx)</h1>
      <p>동화 ID: {storyId}</p>
    </div>
  );
};

export default ChatDetailPage;