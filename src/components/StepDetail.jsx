// src/components/StepDetail.jsx

// StepDetail コンポーネントを定義
const StepDetail = ({ steps, selectedId }) => {
  // 渡されたステップの配列から、選択中のIDと一致するステップを探す
  const selectedStep = steps.find(step => step.id === selectedId);

  // ステップが見つからなかった場合の表示
  if (!selectedStep) {
    return <p>ステップを選択してください。</p>;
  }

  // ステップの詳細を表示
  return (
    <div>
      <h3>{selectedStep.title}</h3>
      <p>{selectedStep.content}</p>
      <p>タイプ: {selectedStep.type}</p>
      <p>Scratch 参照リンク: {selectedStep.scratchLink}</p>
    </div>
  );
};

export default StepDetail;