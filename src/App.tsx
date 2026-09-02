import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import outputs from '../amplify_outputs.json'; // 設定ファイルのインポート
import type { Schema } from '../amplify/data/resource';
import './App.css';

// Amplify の初期化（バックエンドの接続情報を適用）
Amplify.configure(outputs);

// クライアントの生成（API Key 認証を明示）
const client = generateClient<Schema>({
  authMode: 'apiKey',
});

interface MathQuestion {
  id: string;
  num1: number;
  num2: number;
  operator: '+' | '-' | '×';
  answer: number;
}

// --------------------------------------------------
// 1. 問題表示エリア（子コンポーネント）
// --------------------------------------------------
interface QuestionCardProps {
  question: MathQuestion;
  onAnswer: (isCorrect: boolean, answerText: string, timeTaken: number) => void;
  onNext: () => void;
}

function QuestionCard({ question, onAnswer, onNext }: QuestionCardProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [isSubmitted, setIsSubmitted] = useState(false);

  // カウントダウンタイマー
  useEffect(() => {
    if (isSubmitted) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  // 時間切れ処理
  const handleTimeOut = () => {
    setIsSubmitted(true);
    setResultMessage(`⏰ 時間切れ！ 正解は ${question.answer} でした`);
    onAnswer(false, '時間切れ', 10);
  };

  // 回答送信処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = userAnswer.trim();
    if (trimmedInput === '' || isSubmitted) return;

    setIsSubmitted(true);
    const timeTaken = Math.min(10, Math.max(1, Math.round((Date.now() - startTime) / 1000)));

    const userAnsNumber = Number(trimmedInput);
    const correctAnsNumber = Number(question.answer);
    
    const isCorrect = !isNaN(userAnsNumber) && userAnsNumber === correctAnsNumber;

    if (isCorrect) {
      setResultMessage(`⭕ 正解！`);
    } else {
      setResultMessage(`❌ 不正解... 正解は ${question.answer} でした`);
    }

    onAnswer(isCorrect, trimmedInput, timeTaken);
  };

  return (
    <div style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', border: '2px solid #e9ecef', marginBottom: '2rem' }}>
      {/* タイマーバー */}
      <div style={{ width: '100%', background: '#e9ecef', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{
          width: `${(timeLeft / 10) * 100}%`,
          height: '100%',
          background: timeLeft <= 3 ? '#dc3545' : '#007bff',
          transition: 'width 1s linear'
        }} />
      </div>

      {/* 問題文 */}
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        {question.num1} {question.operator} {question.num2} = ?
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            type="number"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="答えを入力"
            disabled={isSubmitted}
            style={{ flex: 1, padding: '0.75rem', fontSize: '1.2rem', borderRadius: '6px', border: '1px solid #ccc' }}
            autoFocus
            required
          />

          {!isSubmitted ? (
            <button
              type="submit"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              回答
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              style={{ padding: '0.75rem 1.5rem', fontSize: '1.1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              次へ ➔
            </button>
          )}
        </div>
      </form>

      {/* 結果メッセージ */}
      {resultMessage && (
        <div style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          marginTop: '1rem',
          padding: '0.75rem',
          borderRadius: '6px',
          backgroundColor: resultMessage.includes('正解！') ? '#d4edda' : '#f8d7da',
          color: resultMessage.includes('正解！') ? '#155724' : '#721c24',
          textAlign: 'center'
        }}>
          {resultMessage}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// 2. メインAppコンポーネント
// --------------------------------------------------
export default function App() {
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('math_app_player_name') || '';
  });
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [logs, setLogs] = useState<Array<Schema['AnswerLog']['type']>>([]);

  const generateNewQuestion = () => {
    const operators: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const selectedOp = operators[Math.floor(Math.random() * operators.length)];

    let n1 = Math.floor(Math.random() * 20) + 1;
    let n2 = Math.floor(Math.random() * 20) + 1;
    let ans = 0;

    if (selectedOp === '+') {
      ans = n1 + n2;
    } else if (selectedOp === '-') {
      if (n1 < n2) [n1, n2] = [n2, n1];
      ans = n1 - n2;
    } else if (selectedOp === '×') {
      n1 = Math.floor(Math.random() * 9) + 1;
      n2 = Math.floor(Math.random() * 9) + 1;
      ans = n1 * n2;
    }

    setCurrentQuestion({
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      num1: n1,
      num2: n2,
      operator: selectedOp,
      answer: ans,
    });
  };

  useEffect(() => {
    generateNewQuestion();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data: answerLogs } = await client.models.AnswerLog.list();
      const sorted = [...answerLogs].sort(
        (a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
      );
      setLogs(sorted);
    } catch (error) {
      console.error('データ取得エラー:', error);
    }
  };

  const handleAnswerResult = async (isCorrect: boolean, answerText: string, timeTaken: number) => {
    if (!currentQuestion) return;

    if (isCorrect) {
      setStreak((prevStreak) => {
        const nextStreak = prevStreak + 1;
        setMaxStreak((prevMax) => Math.max(prevMax, nextStreak));
        return nextStreak;
      });

      setScore((prevScore) => {
        const timeBonus = (10 - timeTaken) * 10;
        const comboMultiplier = 1 + streak * 0.2;
        const addedPoints = Math.round((100 + timeBonus) * comboMultiplier);
        return prevScore + addedPoints;
      });
    } else {
      setStreak(0);
      setScore(0);
    }

    // ニックネームを保存。未入力の場合は "ゲスト"
    const activeUserId = playerName.trim() !== '' ? playerName.trim() : 'ゲスト';

    // DynamoDB保存
    try {
      await client.models.AnswerLog.create({
        userId: activeUserId,
        questionId: `${currentQuestion.num1}${currentQuestion.operator}${currentQuestion.num2}`,
        isCorrect,
        userAnswer: answerText,
        timeTakenSec: timeTaken,
        answeredAt: new Date().toISOString(),
      });
      fetchLogs();
    } catch (error) {
      console.error('DynamoDB保存エラー:', error);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* プレイヤー名入力欄 */}
      <div style={{
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <label htmlFor="playerName" style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#495057', whiteSpace: 'nowrap' }}>
          👤 ニックネーム:
        </label>
        <input
          id="playerName"
          type="text"
          value={playerName}
          onChange={(e) => {
            setPlayerName(e.target.value);
            localStorage.setItem('math_app_player_name', e.target.value);
          }}
          placeholder="名前を入力（空欄は「ゲスト」）"
          maxLength={15}
          style={{
            flex: 1,
            padding: '0.4rem 0.6rem',
            fontSize: '0.95rem',
            borderRadius: '4px',
            border: '1px solid #ced4da'
          }}
        />
      </div>

      {/* スコア表示領域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ background: '#eef2ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
          <div style={{ fontSize: '0.8rem', color: '#4338ca' }}>TOTAL SCORE</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#312e81' }}>{score}</div>
        </div>
        <div style={{ background: '#fff7ed', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fed7aa' }}>
          <div style={{ fontSize: '0.8rem', color: '#c2410c' }}>STREAK</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9a3412' }}>🔥 {streak}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: '0.8rem', color: '#15803d' }}>MAX STREAK</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#166534' }}>👑 {maxStreak}</div>
        </div>
      </div>

      {/* 問題コンポーネント */}
      {currentQuestion && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswerResult}
          onNext={generateNewQuestion}
        />
      )}

      {/* DynamoDB 履歴表示 */}
      <h2>📊 DynamoDB 学習履歴</h2>
      {logs.length === 0 ? (
        <p>回答データはまだありません。</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {logs.slice(0, 5).map((log) => (
            <li
              key={log.id}
              style={{
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span style={{ fontSize: '1.1rem', marginRight: '0.5rem' }}>{log.isCorrect ? '⭕' : '❌'}</span>
                <span style={{
                  fontSize: '0.8rem',
                  background: '#e9ecef',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                  marginRight: '0.5rem',
                  color: '#495057'
                }}>
                  {log.userId || 'ゲスト'}
                </span>
                <strong>{log.questionId}</strong> （回答: {log.userAnswer}）
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                {log.timeTakenSec}秒
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}