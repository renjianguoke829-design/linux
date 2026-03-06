import React, { useState } from 'react';

const TOTAL_STAGES = 5;

export default function Dashboard() {
  const [currentStage, setCurrentStage] = useState(1);
  const progress = Math.round((currentStage / TOTAL_STAGES) * 100);

  const goNext = () => {
    setCurrentStage((prev) => Math.min(TOTAL_STAGES, prev + 1));
  };

  return (
    <div className="h-full grid grid-cols-[1fr_320px] gap-4 p-4 bg-slate-100">
      <div className="space-y-4">
        <section className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">生产流水线</h2>
            <span className="text-sm text-gray-600">当前环节 {currentStage}/{TOTAL_STAGES}</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-4 min-h-[360px]">
            <h3 className="font-medium mb-2">马列版输出</h3>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">
              这里展示马列框架分析结果（占位）：\n- 阶级主体\n- 生产关系矛盾\n- 国家机器位置\n- 历史走向
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 min-h-[360px]">
            <h3 className="font-medium mb-2">对照版输出</h3>
            <div className="text-sm text-gray-600 whitespace-pre-wrap">
              这里展示空白对照版本分析结果（占位）。
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-white p-4 flex justify-end">
          <button
            type="button"
            onClick={goNext}
            className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
            disabled={currentStage >= TOTAL_STAGES}
          >
            进入下一环节
          </button>
        </section>
      </div>

      <aside className="rounded-lg border bg-white p-4">
        <h3 className="font-medium mb-3">决策助手</h3>
        <p className="text-sm text-gray-600 mb-3">可随时触发辅助决策建议。</p>
        <textarea className="w-full h-36 border rounded p-2 text-sm" placeholder="输入当前问题或决策需求..." />
        <button type="button" className="mt-3 w-full px-3 py-2 rounded bg-indigo-600 text-white">
          触发决策助手
        </button>
      </aside>
    </div>
  );
}
