import React, { useEffect, useMemo, useState } from 'react';

const defaultConfig = {
  type: 'http',
  host: '',
  port: '',
  username: '',
  password: '',
  modules: {
    hotspotCrawler: false,
    rabbitCollector: false,
    aiApiCalls: false,
    cloudSync: false,
  },
};

const storeApi = {
  async get() {
    if (window?.electronAPI?.store?.get) {
      return window.electronAPI.store.get('proxyConfig');
    }
    return localStorage.getItem('proxyConfig');
  },
  async set(value) {
    if (window?.electronAPI?.store?.set) {
      return window.electronAPI.store.set('proxyConfig', value);
    }
    localStorage.setItem('proxyConfig', JSON.stringify(value));
    return null;
  },
};

function normalizeConfig(value) {
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
    modules: {
      ...defaultConfig.modules,
      ...(value.modules || {}),
    },
  };
}

export default function ProxyConfig() {
  const [config, setConfig] = useState(defaultConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    (async () => {
      const saved = await storeApi.get();
      setConfig(normalizeConfig(saved));
    })();
  }, []);

  useEffect(() => {
    storeApi.set(config);
  }, [config]);

  const proxyUrl = useMemo(() => {
    if (!config.host || !config.port) return '';
    const auth = config.username
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@`
      : '';
    return `${config.type}://${auth}${config.host}:${config.port}`;
  }, [config]);

  const updateField = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateModule = (name, enabled) => {
    setConfig((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [name]: enabled,
      },
    }));
  };

  const runProxyTest = async () => {
    if (!proxyUrl) {
      setTestResult('请先填写完整代理地址和端口');
      return;
    }

    setTesting(true);
    setTestResult('测试中...');
    try {
      if (window?.electronAPI?.proxy?.testConnectivity) {
        const result = await window.electronAPI.proxy.testConnectivity(config);
        setTestResult(result?.message || '代理测试完成');
      } else {
        setTestResult('未检测到 Electron IPC，当前仅保存配置');
      }
    } catch (error) {
      setTestResult(`代理测试失败: ${error?.message || String(error)}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border space-y-4">
      <h2 className="text-lg font-semibold">代理配置面板</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span>代理类型</span>
          <select
            className="border rounded px-2 py-1"
            value={config.type}
            onChange={(e) => updateField('type', e.target.value)}
          >
            <option value="http">HTTP</option>
            <option value="socks5">SOCKS5</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span>代理地址</span>
          <input
            className="border rounded px-2 py-1"
            value={config.host}
            onChange={(e) => updateField('host', e.target.value)}
            placeholder="127.0.0.1"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>端口</span>
          <input
            className="border rounded px-2 py-1"
            value={config.port}
            onChange={(e) => updateField('port', e.target.value)}
            placeholder="7890"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span>用户名（可选）</span>
          <input
            className="border rounded px-2 py-1"
            value={config.username}
            onChange={(e) => updateField('username', e.target.value)}
            placeholder="username"
          />
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span>密码（可选）</span>
          <input
            type="password"
            className="border rounded px-2 py-1"
            value={config.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="password"
          />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">模块代理开关</h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.modules.hotspotCrawler}
            onChange={(e) => updateModule('hotspotCrawler', e.target.checked)}
          />
          热点抓取
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.modules.rabbitCollector}
            onChange={(e) => updateModule('rabbitCollector', e.target.checked)}
          />
          Rabbit采集
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.modules.aiApiCalls}
            onChange={(e) => updateModule('aiApiCalls', e.target.checked)}
          />
          AI API调用
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.modules.cloudSync}
            onChange={(e) => updateModule('cloudSync', e.target.checked)}
          />
          云盘同步
        </label>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
          onClick={runProxyTest}
          disabled={testing}
        >
          {testing ? '测试中...' : '测试代理连通性'}
        </button>

        <div className="text-sm text-gray-600">当前代理：{proxyUrl || '未配置'}</div>
        {testResult ? <div className="text-sm">{testResult}</div> : null}
      </div>
    </div>
  );
}
