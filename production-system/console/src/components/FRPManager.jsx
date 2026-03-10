import React, { useEffect, useMemo, useState } from 'react';

const defaultConfig = {
  serverHost: '',
  serverPort: 7000,
  token: '',
  mappings: [
    { name: '控制台', localPort: 7681, remotePort: 17681, enabled: true },
    { name: 'pgAdmin', localPort: 5050, remotePort: 15050, enabled: true },
  ],
};

const storeApi = {
  async get() {
    if (window?.electronAPI?.store?.get) {
      return window.electronAPI.store.get('frpConfig');
    }
    return localStorage.getItem('frpConfig');
  },
  async set(value) {
    if (window?.electronAPI?.store?.set) {
      return window.electronAPI.store.set('frpConfig', value);
    }
    localStorage.setItem('frpConfig', JSON.stringify(value));
    return null;
  },
};

function normalize(value) {
  if (!value) return defaultConfig;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return defaultConfig;
    }
  }
  return {
    ...defaultConfig,
    ...value,
    mappings: Array.isArray(value.mappings) && value.mappings.length ? value.mappings : defaultConfig.mappings,
  };
}

export default function FRPManager() {
  const [config, setConfig] = useState(defaultConfig);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('未连接');

  useEffect(() => {
    (async () => {
      const saved = await storeApi.get();
      setConfig(normalize(saved));
    })();
  }, []);

  useEffect(() => {
    storeApi.set(config);
  }, [config]);

  useEffect(() => {
    let timer;
    if (isRunning && window?.electronAPI?.frp?.getLogs) {
      timer = setInterval(async () => {
        try {
          const nextLogs = await window.electronAPI.frp.getLogs();
          if (Array.isArray(nextLogs)) setLogs(nextLogs.slice(-200));
        } catch {
          // no-op
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  const enabledMappings = useMemo(() => config.mappings.filter((m) => m.enabled), [config.mappings]);

  const appendLocalLog = (line) => {
    setLogs((prev) => [...prev.slice(-199), `[${new Date().toLocaleTimeString()}] ${line}`]);
  };

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateMapping = (index, patch) => {
    setConfig((prev) => ({
      ...prev,
      mappings: prev.mappings.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addCustomMapping = () => {
    setConfig((prev) => ({
      ...prev,
      mappings: [
        ...prev.mappings,
        { name: `自定义${prev.mappings.length - 1}`, localPort: 0, remotePort: 0, enabled: true },
      ],
    }));
  };

  const toggleFrp = async () => {
    if (!isRunning) {
      if (!config.serverHost || !config.serverPort || !config.token) {
        appendLocalLog('请先填写 FRP 服务端地址、端口和 Token');
        return;
      }

      try {
        if (window?.electronAPI?.frp?.start) {
          await window.electronAPI.frp.start(config);
        }
        setIsRunning(true);
        setStatus('已连接');
        appendLocalLog(`FRP 启动成功，当前映射数量：${enabledMappings.length}`);
      } catch (error) {
        setStatus('连接失败');
        appendLocalLog(`FRP 启动失败：${error?.message || String(error)}`);
      }
      return;
    }

    try {
      if (window?.electronAPI?.frp?.stop) {
        await window.electronAPI.frp.stop();
      }
      setIsRunning(false);
      setStatus('已停止');
      appendLocalLog('FRP 已停止');
    } catch (error) {
      appendLocalLog(`停止 FRP 失败：${error?.message || String(error)}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FRP 内网穿透管理</h2>
        <span className={`text-sm ${isRunning ? 'text-green-600' : 'text-gray-500'}`}>状态：{status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span>服务端地址</span>
          <input
            className="border rounded px-2 py-1"
            value={config.serverHost}
            onChange={(e) => updateField('serverHost', e.target.value)}
            placeholder="frp.example.com"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>服务端端口</span>
          <input
            type="number"
            className="border rounded px-2 py-1"
            value={config.serverPort}
            onChange={(e) => updateField('serverPort', Number(e.target.value || 0))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Token</span>
          <input
            type="password"
            className="border rounded px-2 py-1"
            value={config.token}
            onChange={(e) => updateField('token', e.target.value)}
            placeholder="frp token"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">本地服务映射</h3>
          <button type="button" className="px-2 py-1 border rounded" onClick={addCustomMapping}>
            添加自定义映射
          </button>
        </div>

        {config.mappings.map((item, index) => (
          <div key={`${item.name}-${index}`} className="grid grid-cols-12 gap-2 items-center">
            <input
              className="border rounded px-2 py-1 col-span-4"
              value={item.name}
              onChange={(e) => updateMapping(index, { name: e.target.value })}
            />
            <input
              type="number"
              className="border rounded px-2 py-1 col-span-3"
              value={item.localPort}
              onChange={(e) => updateMapping(index, { localPort: Number(e.target.value || 0) })}
              placeholder="本地端口"
            />
            <input
              type="number"
              className="border rounded px-2 py-1 col-span-3"
              value={item.remotePort}
              onChange={(e) => updateMapping(index, { remotePort: Number(e.target.value || 0) })}
              placeholder="远端端口"
            />
            <label className="col-span-2 flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={item.enabled}
                onChange={(e) => updateMapping(index, { enabled: e.target.checked })}
              />
              启用
            </label>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-2 rounded text-white bg-indigo-600"
          onClick={toggleFrp}
        >
          {isRunning ? '停止 FRP' : '一键启动 FRP'}
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">连接日志（实时）</h3>
        <div className="h-48 overflow-auto bg-black text-green-300 rounded p-2 text-xs font-mono">
          {logs.length ? logs.map((line, idx) => <div key={`${line}-${idx}`}>{line}</div>) : <div>暂无日志</div>}
        </div>
      </div>
    </div>
  );
}
