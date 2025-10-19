import React from 'react';
import { useParams } from 'react-router-dom';

const FeedbackDetailPage = () => {
  const { storyId } = useParams();
  return (
    <div>
      <h1>피드백 상세 페이지 (FeedbackDetailPage.jsx)</h1>
      <p>동화 ID: {storyId}</p>
    </div>
  );
};

export default FeedbackDetailPage;