// src/app/admin/page.jsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link'; 
import { supabase } from '../../utils/supabase';
import '../../styles/Admin.css';

const Admin = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false); 

  // --- 1. データ読み込み ---
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

  // --- 2. データ保存 ---
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

  // --- 3. 画像アップロード処理 ---
  const handleImageUpload = async (e, gameIndex, stepIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('roadmap-images') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('roadmap-images')
        .getPublicUrl(filePath);

      const newGames = [...games];
      newGames[gameIndex].steps[stepIndex].image = data.publicUrl;
      saveToCloud(newGames); 

      alert('画像を追加しました！📸');

    } catch (error) {
      console.error('Upload Error:', error);
      alert('画像のアップロードに失敗しました...');
    } finally {
      setUploading(false);
    }
  };

  // --- 4. 画像削除処理 (New!) ---
  const handleDeleteImage = (gameIndex, stepIndex) => {
    if (!confirm('この画像を削除しますか？')) return;

    const newGames = [...games];
    newGames[gameIndex].steps[stepIndex].image = ""; // URLを空にする
    saveToCloud(newGames);
  };

  // --- 以下、既存ロジック ---

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const scrollSpeed = useRef(0);
  const animationFrameId = useRef(null);

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

  // 自動スクロール
  const handleWindowDragOver = (e) => {
    const threshold = 100;
    const maxSpeed = 20;
    const { innerHeight } = window;
    const clientY = e.clientY;

    if (clientY < threshold) {
      const intensity = (threshold - clientY) / threshold;
      scrollSpeed.current = -(maxSpeed * intensity);
    } else if (clientY > innerHeight - threshold) {
      const intensity = (clientY - (innerHeight - threshold)) / threshold;
      scrollSpeed.current = maxSpeed * intensity;
    } else {
      scrollSpeed.current = 0;
    }
  };

  const performAutoScroll = () => {
    if (scrollSpeed.current !== 0) {
      window.scrollBy(0, scrollSpeed.current);
    }
    animationFrameId.current = requestAnimationFrame(performAutoScroll);
  };

  const handleDragStart = (e, position) => {
    dragItem.current = position;
    e.target.closest('.admin-step-card').classList.add('dragging');
    window.addEventListener('dragover', handleWindowDragOver);
    animationFrameId.current = requestAnimationFrame(performAutoScroll);
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
    window.removeEventListener('dragover', handleWindowDragOver);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    scrollSpeed.current = 0;
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
                <Link 
                  href={`/print?gameId=${game.gameId}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="delete-btn"
                  style={{ 
                    backgroundColor: '#6f42c1',
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
                    <label>画像:</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={step.image || ""}
                        onChange={(e) => updateStep(gameIndex, stepIndex, 'image', e.target.value)}
                        placeholder="画像のURL（または右からアップロード）"
                        style={{ flex: 1 }}
                      />
                      <label className="save-button" style={{ 
                          fontSize: '12px', padding: '8px', backgroundColor: '#6c757d', cursor: uploading ? 'wait' : 'pointer', margin: 0 
                        }}>
                        {uploading ? '送信中...' : '📂 アップロード'}
                        <input 
                          type="file" 
                          accept="image/*"
                          style={{ display: 'none' }} 
                          onChange={(e) => handleImageUpload(e, gameIndex, stepIndex)}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                    
                    {/* 👇 修正: プレビュー表示＋削除ボタン */}
                    {step.image && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={step.image} alt="preview" style={{ maxHeight: '60px', border: '1px solid #ccc', borderRadius:'4px' }} />
                        <button 
                          className="delete-btn-sm" 
                          onClick={() => handleDeleteImage(gameIndex, stepIndex)}
                          title="画像を削除"
                        >
                          ×
                        </button>
                      </div>
                    )}
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