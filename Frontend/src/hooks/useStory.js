// src/hooks/useStory.js
import { useState, useEffect, useMemo } from 'react';
import { fetchStoryById } from '../api/storyApi.js'; 
/**
 * storyId를 기반으로 스토리 데이터와 페이지네이션 로직을 관리하는 훅
 * @param {string} storyId - useParams()로 받은 스토리 ID
 */
export const useStory = (storyId) => {
    const [page, setPage] = useState(0);
    const [storyData, setStoryData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStory = async () => {
            setIsLoading(true);
            setError(null);
            setStoryData(null);
            setPage(0);
            
            try {
                const data = await fetchStoryById(storyId);
                setStoryData(data); 
            
            } catch (err) {
                setError(err.message || '동화를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        if (storyId) {
            fetchStory(); 
        } else {
            setIsLoading(false);
            setError('유효한 동화 ID가 없습니다.');
        }
        
    }, [storyId]);

    const totalContentPages = (storyData?.total_pages || 1) - 1;

    const goToNextPage = () => {
        if (page < totalContentPages) setPage(prev => prev + 1);
    };
    const goToPrevPage = () => {
        if (page > 0) setPage(prev => prev - 1);
    };
    const currentPageData = useMemo(() => {
        if (!storyData) return null; 

        if (page === 0) {
            return {
                page_number: 0,
                text_content: storyData.title, 
                image_url: storyData.pages[0].image_url, 
                audio_url: storyData.pages[0].audio_url
            };
        }
        return storyData.pages[page];

    }, [storyData, page]);

    const isLastPage = page === totalContentPages && totalContentPages > 0;
    const displayTotalPages = totalContentPages; 

    return {
        isLoading,
        error,
        storyData, 
        currentPageData, 
        page,            
        totalPages: displayTotalPages,
        isLastPage,
        goToNextPage,
        goToPrevPage
    };
};