// src/app/page.jsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../utils/supabase';
import StepDetail from '../components/StepDetail'; 
import '../styles/Roadmap.css'; 

// ウィンドウサイズを監視するフック（レスポンシブ対応用）
const useWindowSize = () => {
    const [size, setSize] = useState({ width: 0, height: 0 });

    // src/app/page.jsx の useWindowSize 内

    useEffect(() => {
        // 1. まずリサイズ時の処理を関数として定義する
        const handleResize = () => {
            setSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // 2. イベントリスナーを登録
        window.addEventListener('resize', handleResize);

        // 3. 初期化のために一度だけ手動で呼ぶ
        handleResize();

        // 4. クリーンアップ
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return size;
};

export default function Home() {
  const windowSize = useWindowSize();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 選択中のゲームIDとステップID
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [selectedStepId, setSelectedStepId] = useState(null);
  
  // 管理者リンクの表示フラグ
  const [isAdminLinkVisible, setIsAdminLinkVisible] = useState(false);

  // --- 1. Supabaseからデータ取得 ---
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('steps')
        .eq('game_id', 'main_roadmap')
        .single();

      if (error) {
        console.error('Error fetching data:', error);
      } else if (data && data.steps) {
        setGames(data.steps);
        // データが取れたら、最初のゲームと最初のステップを選択状態にする
        if (data.steps.length > 0) {
          const firstGame = data.steps[0];
          setSelectedGameId(firstGame.gameId);
          if (firstGame.steps.length > 0) {
            setSelectedStepId(firstGame.steps[0].id);
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // --- 2. 管理者モード隠しコマンド (Ctrl + Alt + A) ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.altKey && event.key === 'a') {
        event.preventDefault(); 
        setIsAdminLinkVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- 3. 表示データの計算 ---
  const selectedGame = useMemo(() => {
    return games.find(g => g.gameId === selectedGameId) || games[0];
  }, [games, selectedGameId]);

  const handleGameSelect = (gameId) => {
    setSelectedGameId(gameId);
    const newGame = games.find(g => g.gameId === gameId);
    if (newGame && newGame.steps.length > 0) {
      setSelectedStepId(newGame.steps[0].id);
    }
  };

  // --- レイアウト設定 (元のコードと同じ) ---
  const PC_BOARD_WIDTH = 1000;
  const X_SPACING = 300;
  const Y_SPACING = 180;      
  const PADDING_X = 50;       
  const PADDING_Y = 50;       
  const CARD_CENTER_OFFSET_X = 70; 
  const CARD_CENTER_OFFSET_Y = 60; 
  const MOBILE_COLUMNS = 2;
  const MOBILE_X_SPACING = 160;
  
  const COLUMNS_PER_ROW = useMemo(() => {
    if (windowSize.width <= 768) {
      return MOBILE_COLUMNS;
    }
    const availableContentWidth = PC_BOARD_WIDTH - 2 * PADDING_X; 
    return Math.max(1, Math.floor(availableContentWidth / X_SPACING));
  }, [windowSize.width]); 

  const getStepPosition = (index) => {
    const row = Math.floor(index / COLUMNS_PER_ROW);
    let col = index % COLUMNS_PER_ROW;
    if (row % 2 !== 0) {
      col = (COLUMNS_PER_ROW - 1) - col; // 偶数行は折り返す
    }
    
    const currentXSpacing = windowSize.width <= 768 ? MOBILE_X_SPACING : X_SPACING; 

    return {
      x: PADDING_X + (col * currentXSpacing),
      y: PADDING_Y + (row * Y_SPACING)
    };
  };

  // SVGラインのパス計算
  const linesPath = useMemo(() => {
    if (!selectedGame || !selectedGame.steps || selectedGame.steps.length < 2) return '';

    let path = '';
    const steps = selectedGame.steps;
    
    for (let i = 0; i < steps.length - 1; i++) {
      const currentPos = getStepPosition(i);
      const nextPos = getStepPosition(i + 1);

      const startX = currentPos.x + CARD_CENTER_OFFSET_X;
      const startY = currentPos.y + CARD_CENTER_OFFSET_Y;
      const endX = nextPos.x + CARD_CENTER_OFFSET_X;
      const endY = nextPos.y + CARD_CENTER_OFFSET_Y;

      path += `M${startX} ${startY} L${endX} ${endY} `;
    }

    return path;
  }, [selectedGame, windowSize.width]); // windowSize依存を追加

  // --- レンダリング ---
  if (loading) return <div className="roadmap-container"><p>ロードマップを読み込んでいます...</p></div>;
  if (!selectedGame) return <div className="roadmap-container"><p>ロードマップデータがありません。</p></div>;

  const totalRows = Math.ceil(selectedGame.steps.length / COLUMNS_PER_ROW);
  const requiredHeight = Math.max(600, PADDING_Y + (totalRows * Y_SPACING) + 50);

  return (
    <>
      {/* 隠しボタン（右上のドット） */}
      <div 
        onClick={() => setIsAdminLinkVisible(true)} 
        style={{ 
          position: 'fixed', top: '60px', right: '5px', zIndex: 100, 
          padding: '20px', opacity: 0.01, cursor: 'pointer' 
        }}>
        .
      </div>

      <div className="app-nav">
        <Link href="/" style={{backgroundColor: '#ff9800'}}>生徒用ロードマップ</Link>
        
        {isAdminLinkVisible && (
          <>
            <span>|</span>
            <Link href="/admin" className="admin-link-visible">管理・編集ツールへ</Link>
          </>
        )}
      </div>

      <div className="roadmap-container">
        {/* ゲーム切り替えタブ */}
        <div className="game-selector"> 
          {games.map(game => (
            <button
              key={game.gameId}
              onClick={() => handleGameSelect(game.gameId)}
              className={game.gameId === selectedGameId ? 'active' : ''}
            >
              {game.gameName}
            </button>
          ))}
        </div>
        
        <h1>{selectedGame.gameName} ロードマップ</h1>
        
        <div className="main-layout">
          {/* 左側：すごろく盤面 */}
          <div className="roadmap-grid-container">
            <div className="roadmap-steps" style={{ height: `${requiredHeight}px` }}>
              {selectedGame.steps.map((step, index) => {
                const pos = getStepPosition(index);
                return (
                  <div 
                    key={step.id} 
                    onClick={() => setSelectedStepId(step.id)} 
                    className={`step-card ${step.id === selectedStepId ? 'active' : ''}`}
                    style={{ top: `${pos.y}px`, left: `${pos.x}px` }}
                  >
                    {step.image && (
                      <img src={step.image} alt={step.title} className="step-image" />
                    )}
                    <h3 className="step-id">Step {step.id}</h3>
                    <p className="step-title">{step.title}</p>
                  </div>
                );
              })}
              
              <svg className="roadmap-lines">
                 <path d={linesPath} stroke="#ff9800" strokeWidth="6" fill="none" strokeDasharray="10 5" />
              </svg>
            </div>
          </div>
          
          {/* 右側：詳細パネル */}
          <div className="detail-panel">
            <h2>ステップ詳細</h2>
            <StepDetail steps={selectedGame.steps} selectedId={selectedStepId} />
          </div>
        </div>
      </div>
    </>
  );
}