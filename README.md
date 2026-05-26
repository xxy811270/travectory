# Travectory - 路书规划

基于高德地图 API 的 Web 路书规划应用，支持空间路书图与时间日程管理。

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的高德 API Key

# 启动开发服务器
npm run dev
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `AMAP_WEB_KEY` | 高德 Web服务 API Key（服务端） |
| `NEXT_PUBLIC_AMAP_JS_KEY` | 高德 JS API Key（前端） |
| `NEXT_PUBLIC_AMAP_SECRET` | 高德密钥（前端） |

## 功能

- **POI 节点管理** — 地图点击、搜索、地址解析、坐标添加
- **路径规划** — 驾车/骑行/步行调用高德 API，火车/飞机/轮船自定义
- **多日日程** — 时间线预估、停留时长、住宿标记、智能路径补全
- **双向联动** — 日程分段地图着色，点击日程 ↔ 聚焦地图
- **导出** — HTML 路书（含交互地图）、JSON 项目文件、GPX 轨迹
- **分享** — 只读链接
- **用户系统** — 注册/登录，数据隔离

## 技术栈

Next.js 16 · TypeScript · SQLite · Zustand · Tailwind CSS · 高德 JS API v2.0
