import React from 'react';
import { useParams } from 'react-router-dom';

const StoryPage = () => {
  const { storyId } = useParams();
  return (
    <div>
      <h1>동화 읽기 페이지 (StoryPage.jsx)</h1>
      <p>동화 ID: {storyId}</p>
    </div>
  );
};

export default StoryPage;