import React, { useMemo, useState } from 'react';

const MODULES = [
  { key: 'pipeline', icon: '⚙️', label: '流水线' },
  { key: 'browser', icon: '🧭', label: '浏览器' },
  { key: 'llm', icon: '🤖', label: '大模型' },
  { key: 'database', icon: '🗄️', label: '数据库' },
  { key: 'terminal', icon: '💻', label: '终端' },
  { key: 'cloud', icon: '☁️', label: '云盘' },
  { key: 'systemBridge', icon: '🧩', label: '嵌入式接口' },
  { key: 'brandStudio', icon: '🎨', label: '自定义图标工坊' },
  { key: 'videoHub', icon: '▶️', label: '视频站接入' },
  { key: 'orgCollab', icon: '🏢', label: '组织协作' },
  { key: 'teaRoom', icon: '🍵', label: '茶水间' },
  { key: 'community', icon: '👥', label: '社区' },
];

function Placeholder({ title, children }) {
  return (
    <div className="p-6 border rounded-xl bg-white/80 space-y-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-gray-600">即将上线</p>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  );
}

function OrgCollabPlaceholder() {
  return (
    <div className="p-6 border rounded-xl bg-white/80 space-y-4">
      <h2 className="text-2xl font-semibold">组织协作（OrgCollab）</h2>
      <p className="text-gray-600">组织和个人数据严格隔离（结构预留）</p>
      <ul className="list-disc pl-6 text-sm space-y-1">
        <li>组织生产看板（与个人分开）</li>
        <li>个人生产看板</li>
        <li>任务分配界面</li>
        <li>贡献度记录</li>
      </ul>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="border rounded p-3 bg-slate-50">
          <div className="font-medium">组织数据区</div>
          <div className="text-xs text-gray-600">仅允许 org_id 范围查询与写入</div>
        </div>
        <div className="border rounded p-3 bg-slate-50">
          <div className="font-medium">个人数据区</div>
          <div className="text-xs text-gray-600">仅允许 member_id 范围查询与写入</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState('pipeline');

  const content = useMemo(() => {
    switch (active) {
      case 'systemBridge':
        return (
          <Placeholder title="嵌入式接口（SystemBridge）">
            预留能力：文件管理器、终端命令执行、硬件状态监控。
          </Placeholder>
        );
      case 'brandStudio':
        return (
          <Placeholder title="自定义图标工坊（BrandStudio）">
            上传 LOGO / 替换系统图标 / 主题视觉定制（上传入口占位）。
          </Placeholder>
        );
      case 'videoHub':
        return (
          <Placeholder title="视频站接入（VideoHub）">
            预留能力：接入自建视频网站、视频内容管理、短剧发布推送。
          </Placeholder>
        );
      case 'orgCollab':
        return <OrgCollabPlaceholder />;
      case 'teaRoom':
        return (
          <Placeholder title="茶水间（TeaRoom）">社区讨论 / 公告 / 休闲（占位）。</Placeholder>
        );
      case 'community':
        return <Placeholder title="社区（Community）">成员广场 / 话题 / 投票（占位）。</Placeholder>;
      default:
        return <Placeholder title="模块占位">当前模块功能开发中。</Placeholder>;
    }
  }, [active]);

  return (
    <div className="h-screen w-full grid grid-cols-[220px_1fr] bg-slate-100">
      <aside className="border-r bg-white p-3 overflow-auto">
        <h1 className="font-bold mb-3">主控制台</h1>
        <nav className="space-y-1">
          {MODULES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
                active === m.key ? 'bg-blue-600 text-white' : 'hover:bg-slate-100'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="p-4 overflow-auto">{content}</main>
    </div>
  );
}
