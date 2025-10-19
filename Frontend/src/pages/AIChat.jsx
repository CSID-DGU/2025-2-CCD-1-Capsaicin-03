import React from 'react';
import { useParams } from 'react-router-dom';

const AIChat = () => {
  const { storyId } = useParams();
  return (
    <div>
      <h1>AI 대화 페이지 (AIChat.jsx)</h1>
      <p>동화 ID: {storyId}</p>
    </div>
  );
};

export default AIChat;