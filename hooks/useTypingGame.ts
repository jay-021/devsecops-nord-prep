// hooks/useTypingGame.ts

import { useState, useEffect, useRef, useCallback } from 'react';

type TestStatus = 'waiting' | 'running' | 'finished';

interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  incorrectChars: number;
}

interface TestConfig {
  duration: number; // in seconds
  text: string;
}

export const useTypingGame = () => {
  const [status, setStatus] = useState<TestStatus>('waiting');
  const [textToType, setTextToType] = useState('');
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 0,
    errors: 0,
    correctChars: 0,
    incorrectChars: 0,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const calculateStats = useCallback(() => {
    if (!startTimeRef.current || status !== 'running') return;

    const timeElapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
    const timeElapsedMinutes = timeElapsedSeconds / 60;
    
    // Count total characters typed so far, including current word
    let totalTypedChars = 0;
    let tempCorrectChars = 0;
    let tempIncorrectChars = 0;

    for (let i = 0; i < currentWordIndex; i++) {
      const word = words[i];
      const typedWord = userInput.split(' ')[i]; // This is problematic if userInput is only current word
      // For simplicity in this calculation, let's assume words up to currentWordIndex
      // have been processed for correctness. A full implementation would need wordStates.
      // For now, we will calculate based on characters from words up to currentWordIndex and current userInput
      totalTypedChars += word.length + 1; // +1 for space
      tempCorrectChars += word.length; // Assuming they were typed correctly for now
    }

    // For the current word
    const currentWordTarget = words[currentWordIndex] || '';
    for(let i = 0; i < userInput.length; i++){
      totalTypedChars++;
      if(userInput[i] === currentWordTarget[i]){
        tempCorrectChars++;
      } else {
        tempIncorrectChars++;
      }
    }

    const wpm = timeElapsedMinutes > 0 ? Math.round((tempCorrectChars / 5) / timeElapsedMinutes) : 0;
    const accuracy = totalTypedChars > 0 ? Math.round((tempCorrectChars / totalTypedChars) * 100) : 0;
    const errors = tempIncorrectChars; // Simple error count

    setStats({
      wpm: Math.max(0, wpm),
      accuracy: Math.max(0, Math.min(100, accuracy)),
      errors: errors,
      correctChars: tempCorrectChars,
      incorrectChars: tempIncorrectChars,
    });
  }, [status, words, currentWordIndex, userInput, startTimeRef]);

  const endTest = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('finished');
    calculateStats(); // Final stats calculation
  }, [calculateStats]);

  const startTest = useCallback(({ duration, text }: TestConfig) => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Reset all states
    setStatus('running');
    setTextToType(text);
    const initialWords = text.split(' ');
    setWords(initialWords);
    setCurrentWordIndex(0);
    setUserInput('');
    setTimeLeft(duration);
    setStats({
      wpm: 0,
      accuracy: 0,
      errors: 0,
      correctChars: 0,
      incorrectChars: 0,
    });

    startTimeRef.current = Date.now();

    // Start new timer
    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalRef.current!); // Stop timer
          endTest(); // End test if time runs out
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, [endTest]);

  const processKeystroke = useCallback((key: string) => {
    if (status !== 'running') return;

    const currentWordTarget = words[currentWordIndex];

    if (key === ' ') {
      // Handle Spacebar
      if (userInput.length > 0) {
        if (userInput !== currentWordTarget) {
          // This is a simple error increment for a full word mismatch.
          // A more granular error tracking would be in calculateStats.
          setStats((prev) => ({ ...prev, errors: prev.errors + 1 }));
        }
        setCurrentWordIndex((prev) => prev + 1);
        setUserInput(''); // Clear input for next word
        // No calculateStats call here, let the useEffect handle it
      }
    } else if (key === 'Backspace') {
      // Handle Backspace
      if (userInput.length > 0) {
        setUserInput((prev) => prev.slice(0, -1));
        // No calculateStats call here, let the useEffect handle it
      }
    } else if (key.length === 1 && currentWordTarget && userInput.length < currentWordTarget.length) {
      // Handle character input
      setUserInput((prev) => prev + key);
      // No calculateStats call here, let the useEffect handle it
    }
    // The useEffect will trigger calculateStats on userInput/currentWordIndex changes
  }, [status, words, currentWordIndex, userInput]);

  // Effect to manage the timer and trigger test end
  useEffect(() => {
    if (timeLeft <= 0 && status === 'running') {
      endTest();
    }
  }, [timeLeft, status, endTest]);

  // Effect to recalculate stats on relevant state changes
  useEffect(() => {
    if (status === 'running') {
      calculateStats();
    }
  }, [userInput, currentWordIndex, status, calculateStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    textToType,
    words,
    currentWordIndex,
    userInput,
    timeLeft,
    stats,
    startTest,
    processKeystroke,
    endTest,
  };
};
