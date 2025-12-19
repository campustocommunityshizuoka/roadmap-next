// src/app/admin/page.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link'; 
import { supabase } from '../../utils/supabase';
import '../../styles/Admin.css';

const Admin = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. データ読み込み (Supabaseから) ---
  useEffect(() => {
    const fetchGames = async () => {
      const { data, error } = await supabase
        .from('games')
        .select('steps')
        .eq('game_id', 'main_roadmap')
        .single();

      if (error) {
        console.error('読み込みエラー:', error);
      } else if (data && data.steps) {
        setGames(data.steps);
      }
      setLoading(false);
    };

    fetchGames();
  }, []);

  // --- 2. データ保存 (Supabaseへ) ---
  const saveToCloud = async (newGames) => {
    setGames(newGames);

    const { error } = await supabase
      .from('games')
      .update({ steps: newGames })
      .eq('game_id', 'main_roadmap');

    if (error) {
      alert('保存に失敗しました... 😭');
      console.error(error);
    } else {
      console.log('クラウドに保存完了 ✅');
    }
  };

  // --- 以下、ロジック ---

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const updateGame = (gameIndex, field, value) => {
    const newGames = [...games];
    newGames[gameIndex][field] = value;
    saveToCloud(newGames);
  };

  const addGame = () => {
    const newGame = {
      gameId: `new_game_${Date.now()}`,
      gameName: "新しいゲーム",
      description: "ここにゲームの説明が入ります",
      steps: []
    };
    saveToCloud([...games, newGame]);
  };

  const deleteGame = (gameIndex) => {
    if (window.confirm("本当にこのゲームを削除しますか？")) {
      const newGames = games.filter((_, i) => i !== gameIndex);
      saveToCloud(newGames);
    }
  };

  const addStep = (gameIndex) => {
    const newGames = [...games];
    const newStepId = newGames[gameIndex].steps.length + 1;
    newGames[gameIndex].steps.push({
      id: newStepId,
      title: "新しいステップ",
      content: "説明を入力してください",
      type: "setup",
      image: ""
    });
    saveToCloud(newGames);
  };

  const updateStep = (gameIndex, stepIndex, field, value) => {
    const newGames = [...games];
    newGames[gameIndex].steps[stepIndex][field] = value;
    saveToCloud(newGames);
  };

  const deleteStep = (gameIndex, stepIndex) => {
    const newGames = [...games];
    newGames[gameIndex].steps = newGames[gameIndex].steps.filter((_, i) => i !== stepIndex);
    newGames[gameIndex].steps = newGames[gameIndex].steps.map((step, i) => ({...step, id: i + 1}));
    saveToCloud(newGames);
  };

  const handleDragStart = (e, position) => {
    dragItem.current = position;
    e.target.closest('.admin-step-card').classList.add('dragging');
  };

  const handleDragEnter = (e, position, gameIndex) => {
    dragOverItem.current = position;
    if (dragItem.current === null || dragItem.current === dragOverItem.current) return;

    const newGames = [...games];
    const gameSteps = [...newGames[gameIndex].steps];
    const draggedStepContent = gameSteps[dragItem.current];
    gameSteps.splice(dragItem.current, 1);
    gameSteps.splice(dragOverItem.current, 0, draggedStepContent);

    const reIndexedSteps = gameSteps.map((step, i) => ({ ...step, id: i + 1 }));
    newGames[gameIndex].steps = reIndexedSteps;
    
    setGames(newGames); 
    dragItem.current = dragOverItem.current;
  };

  const handleDragEnd = (e, gameIndex) => {
    dragItem.current = null;
    dragOverItem.current = null;
    e.target.closest('.admin-step-card').classList.remove('dragging');
    saveToCloud(games);
  };

  if (loading) return <div style={{padding: '50px', textAlign:'center'}}>データを読み込んでいます...</div>;

  return (
    <>
      <div className="app-nav">
        <Link href="/">生徒用ページへ（確認）</Link>
        <span>|</span>
        <Link href="/admin" style={{backgroundColor: '#007bff'}}>管理・編集ツール</Link>
      </div>

      <div className="admin-container">
        <div className="admin-header">
          <h1>🛠️ ロードマップ作成ツール (クラウド版)</h1>
          <p className="note">
            ※ 編集内容は <b>Supabase</b> に自動保存されます。<br/>
            ここでの変更は、リロードすると生徒用ページにも反映されます。
          </p>
        </div>

        {games.map((game, gameIndex) => (
          <div key={game.gameId} className="admin-game-card">
            <div className="game-header">
              <input
                type="text"
                value={game.gameName}
                onChange={(e) => updateGame(gameIndex, 'gameName', e.target.value)}
                className="input-title"
                placeholder="ゲーム名"
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* 👇 ここに印刷ボタンを追加しました！ */}
                <Link 
                  href={`/print/${game.gameId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="delete-btn" // 同じクラスを使ってボタンっぽく見せる
                  style={{ 
                    backgroundColor: '#6f42c1', // 紫色
                    textDecoration: 'none', 
                    textAlign: 'center', 
                    display:'flex', 
                    alignItems:'center',
                    justifyContent: 'center',
                    color: 'white',
                    padding: '0 10px',
                    fontSize: '14px'
                  }}
                >
                  🖨️ 台紙を印刷
                </Link>

                <button className="delete-btn" onClick={() => deleteGame(gameIndex)}>削除</button>
              </div>
            </div>
            
            <div className="form-group">
              <label>ID:</label>
              <input
                type="text"
                value={game.gameId}
                onChange={(e) => updateGame(gameIndex, 'gameId', e.target.value)}
              />
              <label>説明:</label>
              <input
                type="text"
                value={game.description}
                onChange={(e) => updateGame(gameIndex, 'description', e.target.value)}
                style={{width: '50%'}}
              />
            </div>

            <h3>ステップ一覧 (≡ をドラッグして並び替え)</h3>
            <div className="steps-list">
              {game.steps.map((step, stepIndex) => (
                <div 
                  key={step.id} 
                  className="admin-step-card"
                  onDragEnter={(e) => handleDragEnter(e, stepIndex, gameIndex)}
                  onDragOver={(e) => e.preventDefault()} 
                  draggable 
                  onDragStart={(e) => handleDragStart(e, stepIndex)}
                  onDragEnd={(e) => handleDragEnd(e, gameIndex)}
                >
                  <div className="step-header">
                    <div className="step-header-left">
                      <span className="drag-handle">☰</span>
                      <span className="step-number">Step {step.id}</span>
                    </div>
                    <button className="delete-btn-sm" onClick={() => deleteStep(gameIndex, stepIndex)}>×</button>
                  </div>
                  
                  <div className="form-row">
                    <label>タイトル:</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(gameIndex, stepIndex, 'title', e.target.value)}
                    />
                  </div>
                  
                  <div className="form-row">
                    <label>内容:</label>
                    <textarea
                      value={step.content}
                      onChange={(e) => updateStep(gameIndex, stepIndex, 'content', e.target.value)}
                    />
                  </div>

                  <div className="form-row">
                    <label>画像パス:</label>
                    <input
                      type="text"
                      value={step.image || ""}
                      onChange={(e) => updateStep(gameIndex, stepIndex, 'image', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              
              <button className="add-step-btn" onClick={() => addStep(gameIndex)}>
                ＋ ステップを追加
              </button>
            </div>
          </div>
        ))}

        <button className="add-game-btn" onClick={addGame}>
          ＋ 新しいゲームを追加
        </button>
      </div>
    </>
  );
};

export default Admin;