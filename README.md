# 期权 GEX/VEX 热力图

这是一个本地桌面 Web 应用，用来按行权价和到期日查看期权 Gamma Exposure（GEX）以及模型估算的 Vanna Exposure（VEX）。

默认模式使用演示数据，不需要券商账号。项目仍保留可选的 Moomoo/Futu OpenD 本地实时数据路径，但只有在你明确启用时才会连接 OpenD。

## 功能亮点

- 简体中文 / English 语言切换，默认简体中文，并会记住上次选择。
- GEX/VEX 热力图，按行权价和到期日展示净敞口。
- 详情面板展示 Call/Put 拆分、OI、Gamma、Vanna、IV 等输入。
- 支持 `demo`、`auto`、`moomoo` 三种数据模式。
- 公开默认配置安全：不包含账号、密钥或本地 `.env.local`。

## 环境要求

- Node.js 20 或更新版本。
- npm（随 Node.js 一起安装）。
- 默认演示模式不需要券商账号。
- 只有使用本地实时 OpenD 数据时，才需要 Moomoo/Futu 账号。

## 快速开始

```powershell
npm.cmd install
npm.cmd run dev
```

打开：

```text
http://127.0.0.1:5173
```

## 语言切换

应用默认显示简体中文。工具栏右侧有 `中文 / EN` 切换按钮，选择会保存到浏览器 `localStorage`，刷新后仍会保留。

GEX、VEX、OI、IV、OpenD、Moomoo、Ticker 等金融或产品术语会保留英文缩写，避免和券商/API 文档脱节。

## 数据模式

- `demo`：默认演示数据，包含 SPY、QQQ、TSLA、VIX、SPXW 等样本标的。
- `auto`：默认仍使用 demo。只有本地设置 `MOOMOO_AUTO_CONNECT=true` 时，才会先尝试 Moomoo/Futu OpenD，失败后回退到 demo 并显示提示。
- `moomoo`：明确尝试本地 OpenD 路径；若 OpenD 不可用，也会回退到 demo，保证应用仍可使用。

## 可选：使用 Moomoo/Futu OpenD 实时数据

实时数据通过你自己的本地 Moomoo/Futu OpenD 网关获取。本仓库不包含账号凭据或 API 密钥。

启用前请完成：

1. 创建或使用已有 Moomoo/Futu 账号，并确认账号有目标市场数据权限。
2. 从官方 OpenAPI 下载页安装 Moomoo OpenD：`https://www.moomoo.com/download/OpenAPI`。
3. 在本机启动 OpenD，并在 OpenD 内登录你的 Moomoo/Futu 账号。
4. 在应用使用的 Python 环境里安装 SDK：

```powershell
pip install moomoo-api
```

5. 复制 `.env.example` 为 `.env.local`，并配置本地 OpenD：

```env
OPTIONS_PROVIDER=moomoo
MOOMOO_OPEND_HOST=127.0.0.1
MOOMOO_OPEND_PORT=11111
MOOMOO_PYTHON=python
MOOMOO_AUTO_CONNECT=false
```

当你明确希望使用实时 OpenD 数据时，设置 `OPTIONS_PROVIDER=moomoo`。除非希望 `auto` 模式自动尝试 OpenD，否则建议保持 `MOOMOO_AUTO_CONNECT=false`。

OpenD 是 Moomoo/Futu API 程序使用的本地网关。Python SDK 会连接到配置的 host 和 port；账号登录和权限由 OpenD 处理，不由本仓库处理。

不要提交 `.env.local`、`.venv/`、`node_modules/`、`dist/` 或 `dist-server/`；这些都是本地或生成文件。

## 指标说明

GEX 按标的价格每 1% 变动计算：

```text
gamma * openInterest * contractSize * spot^2 * 0.01
```

Call 敞口按正值处理，Put 敞口按负值处理。

当数据源没有提供 vanna 时，VEX 使用 Black-Scholes vanna 进行模型估算：

```text
vanna = -phi(d1) * d2 / iv
```

随后按未平仓量、合约乘数、标的价格和 1% 波动率变动进行缩放。VEX 是敞口估算，不是券商认证指标。

## 常用命令

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run dev
```

## 免责声明

本工具仅用于信息展示和研究，不构成投资建议，也不会下单或执行交易。
