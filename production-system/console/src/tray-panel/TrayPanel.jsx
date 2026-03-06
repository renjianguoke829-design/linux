import React, { useEffect, useState } from 'react';

const defaultStats = {
  todayOutput: 0,
  currentStage: '待机中',
  latestCardTitle: '暂无矛盾卡',
};

const defaultServices = [
  { name: 'PostgreSQL', online: false },
  { name: 'Docker', online: false },
  { name: 'Ollama', online: false },
];

export default function TrayPanel() {
  const [stats, setStats] = useState(defaultStats);
  const [services, setServices] = useState(defaultServices);

  const load = async () => {
    try {
      if (window?.electronAPI?.tray?.getStats) {
        const nextStats = await window.electronAPI.tray.getStats();
        setStats({ ...defaultStats, ...(nextStats || {}) });
      }
      if (window?.electronAPI?.tray?.getServices) {
        const nextServices = await window.electronAPI.tray.getServices();
        if (Array.isArray(nextServices)) setServices(nextServices);
      }
    } catch {
      // ignore, keep placeholder values
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenMain = async () => {
    if (window?.electronAPI?.tray?.openMain) {
      await window.electronAPI.tray.openMain();
    }
  };

  const handleStartPipeline = async () => {
    if (window?.electronAPI?.tray?.startPipeline) {
      await window.electronAPI.tray.startPipeline();
      await load();
    }
  };

  const handleOpenDatabase = async () => {
    if (window?.electronAPI?.tray?.openMain) {
      await window.electronAPI.tray.openMain('database');
    }
  };

  return (
    <div
      className="w-[320px] h-[400px] rounded-2xl shadow-2xl bg-white p-4 flex flex-col"
      style={{ width: 320, height: 400 }}
    >
      <section className="mb-3">
        <div className="text-xs text-gray-500">今日产出</div>
        <div className="text-5xl font-bold leading-none mt-1">{stats.todayOutput}</div>
      </section>

      <section className="flex-1 space-y-3 overflow-hidden">
        <div className="rounded-lg border p-3">
          <div className="text-sm text-gray-500">流水线状态</div>
          <div className="font-medium mt-1">当前工序：{stats.currentStage}</div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-sm text-gray-500 mb-2">服务状态</div>
          <div className="space-y-2">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <span>{service.name}</span>
                <span className="flex items-center gap-2">
                  <i
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: service.online ? '#22c55e' : '#ef4444' }}
                  />
                  {service.online ? '在线' : '离线'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-sm text-gray-500">最新矛盾卡</div>
          <div className="mt-1 text-sm font-medium line-clamp-2">{stats.latestCardTitle}</div>
        </div>
      </section>

      <section className="pt-3 mt-3 border-t grid grid-cols-3 gap-2">
        <button type="button" onClick={handleStartPipeline} className="px-2 py-2 text-xs rounded bg-blue-600 text-white">
          开始流水线
        </button>
        <button type="button" onClick={handleOpenDatabase} className="px-2 py-2 text-xs rounded border">
          查看数据库
        </button>
        <button type="button" onClick={handleOpenMain} className="px-2 py-2 text-xs rounded border">
          完整控制台
        </button>
      </section>
    </div>
  );
}
