import React, { useEffect, useMemo, useState } from 'react';

const defaultOverview = {
  todayCollection: 0,
  totalRows: 0,
  tier1: 0,
  tier2: 0,
  tier3: 0,
  todayProductionCount: 0,
};

const defaultContradictionStats = {
  total: 0,
  todayNew: 0,
  byTheme: [],
};

function getTierPercentages(overview) {
  const sum = overview.tier1 + overview.tier2 + overview.tier3;
  if (!sum) return { t1: 0, t2: 0, t3: 0 };
  return {
    t1: Math.round((overview.tier1 / sum) * 100),
    t2: Math.round((overview.tier2 / sum) * 100),
    t3: Math.max(0, 100 - Math.round((overview.tier1 / sum) * 100) - Math.round((overview.tier2 / sum) * 100)),
  };
}

export default function DataAnalysis() {
  const [overview, setOverview] = useState(defaultOverview);
  const [streamItems, setStreamItems] = useState([]);
  const [contradictionStats, setContradictionStats] = useState(defaultContradictionStats);
  const [productionRecords, setProductionRecords] = useState([]);
  const [sql, setSql] = useState('SELECT * FROM raw_data ORDER BY collected_at DESC LIMIT 20;');
  const [sqlResult, setSqlResult] = useState({ columns: [], rows: [], error: '' });
  const [runningQuery, setRunningQuery] = useState(false);

  const tiers = useMemo(() => getTierPercentages(overview), [overview]);

  const loadDashboard = async () => {
    try {
      const api = window?.electronAPI?.dataAnalysis;
      if (!api) return;

      const [nextOverview, nextStream, nextContradiction, nextProductions] = await Promise.all([
        api.getOverview?.(),
        api.getRealtimeStream?.(),
        api.getContradictionStats?.(),
        api.getProductionRecords?.(),
      ]);

      if (nextOverview) setOverview({ ...defaultOverview, ...nextOverview });
      if (Array.isArray(nextStream)) setStreamItems(nextStream);
      if (nextContradiction) setContradictionStats({ ...defaultContradictionStats, ...nextContradiction });
      if (Array.isArray(nextProductions)) setProductionRecords(nextProductions);
    } catch {
      // keep placeholders when backend not ready
    }
  };

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 10000);
    return () => clearInterval(timer);
  }, []);

  const executeSql = async () => {
    if (!sql.trim()) {
      setSqlResult({ columns: [], rows: [], error: 'SQL 不能为空' });
      return;
    }

    setRunningQuery(true);
    try {
      const api = window?.electronAPI?.dataAnalysis;
      if (!api?.runSql) {
        setSqlResult({ columns: [], rows: [], error: '未检测到 SQL 查询接口（electronAPI.dataAnalysis.runSql）' });
        return;
      }

      const result = await api.runSql(sql);
      setSqlResult({
        columns: result?.columns || [],
        rows: result?.rows || [],
        error: result?.error || '',
      });
    } catch (error) {
      setSqlResult({ columns: [], rows: [], error: error?.message || String(error) });
    } finally {
      setRunningQuery(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">数据分析面板</h1>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 bg-white">
          <div className="text-sm text-gray-500">今日采集量</div>
          <div className="text-2xl font-bold mt-1">{overview.todayCollection}</div>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <div className="text-sm text-gray-500">数据库总条数</div>
          <div className="text-2xl font-bold mt-1">{overview.totalRows}</div>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <div className="text-sm text-gray-500">tier1/2/3 分布</div>
          <div className="mt-2 flex items-center gap-3">
            <div
              className="w-20 h-20 rounded-full"
              style={{
                background: `conic-gradient(#22c55e 0% ${tiers.t1}%, #f59e0b ${tiers.t1}% ${tiers.t1 + tiers.t2}%, #ef4444 ${tiers.t1 + tiers.t2}% 100%)`,
              }}
            />
            <div className="text-sm space-y-1">
              <div>Tier1: {overview.tier1} ({tiers.t1}%)</div>
              <div>Tier2: {overview.tier2} ({tiers.t2}%)</div>
              <div>Tier3: {overview.tier3} ({tiers.t3}%)</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <div className="text-sm text-gray-500">今日生产次数</div>
          <div className="text-2xl font-bold mt-1">{overview.todayProductionCount}</div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">实时数据流</div>
          <div className="text-xs text-gray-500 mb-2">最新采集数据（域名 / 来源 / 时间）</div>
          <div className="h-44 overflow-auto space-y-2">
            {streamItems.length ? (
              streamItems.map((item, idx) => (
                <div key={`${item.domain || 'domain'}-${idx}`} className="text-sm border-b pb-2">
                  <div className="font-medium">{item.domain || 'unknown-domain'}</div>
                  <div className="text-gray-600">来源：{item.source || '-'}</div>
                  <div className="text-gray-500 text-xs">时间：{item.time || '-'}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">暂无实时数据</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-3 bg-white">
          <div className="font-medium mb-2">矛盾卡统计</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="border rounded p-2">
              <div className="text-gray-500">总数</div>
              <div className="text-xl font-semibold">{contradictionStats.total}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-gray-500">今日新增</div>
              <div className="text-xl font-semibold">{contradictionStats.todayNew}</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-sm text-gray-600 mb-1">按主题分类</div>
            <div className="space-y-1 text-sm">
              {contradictionStats.byTheme?.length ? (
                contradictionStats.byTheme.map((item, idx) => (
                  <div key={`${item.theme || 'theme'}-${idx}`} className="flex justify-between border rounded px-2 py-1">
                    <span>{item.theme || '未分类'}</span>
                    <span>{item.count || 0}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">暂无主题统计</div>
              )}
            </div>
          </div>

          <button type="button" className="mt-3 px-3 py-2 rounded bg-indigo-600 text-white text-sm">
            打开知识图谱
          </button>
        </div>
      </section>

      <section className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">生产记录</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-2">模型</th>
                <th className="py-2 pr-2">输入</th>
                <th className="py-2 pr-2">输出</th>
                <th className="py-2 pr-2">生产时长</th>
              </tr>
            </thead>
            <tbody>
              {productionRecords.length ? (
                productionRecords.map((row, idx) => (
                  <tr key={`record-${idx}`} className="border-b align-top">
                    <td className="py-2 pr-2 whitespace-nowrap">{row.model || '-'}</td>
                    <td className="py-2 pr-2 max-w-[280px] truncate" title={row.input || ''}>{row.input || '-'}</td>
                    <td className="py-2 pr-2 max-w-[280px] truncate" title={row.output || ''}>{row.output || '-'}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{row.durationMs ?? '-'} ms</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-500">暂无生产记录</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-3 bg-white space-y-2">
        <div className="font-medium">数据库直查</div>
        <div className="text-xs text-gray-500">简单 SQL 输入并查看结果（无需打开终端）</div>
        <textarea
          className="w-full border rounded p-2 font-mono text-sm h-24"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />
        <div>
          <button
            type="button"
            className="px-3 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            onClick={executeSql}
            disabled={runningQuery}
          >
            {runningQuery ? '查询中...' : '执行查询'}
          </button>
        </div>

        {sqlResult.error ? <div className="text-sm text-red-600">错误：{sqlResult.error}</div> : null}

        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {sqlResult.columns.map((col) => (
                  <th key={col} className="text-left px-2 py-1 border-b">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sqlResult.rows.map((row, idx) => (
                <tr key={`sql-row-${idx}`} className="border-b">
                  {sqlResult.columns.map((col) => (
                    <td key={`${idx}-${col}`} className="px-2 py-1">{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
