# N.A.V.I. Terminal

SillyTavern 第三方扩展：独立面板，提供 **观测委托** 与 **EroLinks** 等功能。

> **本项目是依赖 [yuzuki-phone（柚月小手机）](https://github.com/gaigai315/yuzuki-phone) 的二创个人项目。**  
> 不修改手机源码，通过 `window.VirtualPhone` 桥接其 API 运行。

## 声明

- **个人二创 / 学习交流用途**，非官方插件，与 yuzuki-phone 作者无隶属关系。
- **强依赖** yuzuki-phone：未安装或未启用时，本扩展无法正常使用。
- yuzuki-phone 的版权与使用条款以其仓库为准；请遵守其「禁止商业化 / 禁止未授权二改发布」等要求。
- 本仓库代码仅供个人学习与自用改造参考，**请勿用于商业售卖或未授权二次分发**。

## 依赖

| 依赖 | 说明 |
|------|------|
| [SillyTavern](https://github.com/SillyTavern/SillyTavern) | 宿主 |
| [yuzuki-phone](https://github.com/gaigai315/yuzuki-phone) | 必须先安装；提供 storage / ApiManager / 世界书 / 时间等能力 |

建议安装顺序：先装 **yuzuki-phone**，再装本扩展。  
`manifest.json` 中 `loading_order` 为 `201`（略晚于手机常见的 `200`）。

## 功能

- **观测委托（v4 委托板）**：观测 / 把玩；1/3/6 条追加生成；状态（未用/进行中/收藏/已用）；单条重 roll；多种导出模板  
  → 详细说明见 [`docs/观测委托使用说明.md`](docs/观测委托使用说明.md)
- **EroLinks**：**人物信息**（只读 HUD + 档案 + 刷新）与 **催眠与指令**（催眠生效/停止、着装指令预览写入）
- **Bridge 桥接层**（v2.1+）：就绪探测、能力降级、提示词自持，降低手机版本更新带来的耦合风险

## 安装

### 扩展管理器

1. SillyTavern → 扩展 → 安装扩展  
2. 粘贴仓库地址（任选其一）：
   - GitHub：`https://github.com/SakuraAho/re-navi-terminal.git`
   - Gitee：`https://gitee.com/sakuraaho/re-navi-terminal.git`
3. 安装并刷新页面  
4. 确认 yuzuki-phone 已启用；页面出现 📱 浮动按钮即可打开终端

### 手动安装

将本仓库放到：

```text
SillyTavern/public/scripts/extensions/third-party/re-navi-terminal/
```

目录下需直接包含 `manifest.json`、`index.js`、`bridge.js` 等，然后重启 / 刷新 SillyTavern。

## 使用注意

1. 在 yuzuki-phone 设置中配置好 **线上 API**（本扩展的 AI 调用走手机 `ApiManager`）。  
2. 打开终端首页可查看 **桥接状态**（是否检测到手机、版本与能力）。  
3. 世界书勾选、提示词编辑在各 App 设置页；提示词优先存在终端自持存储中，并尽量软同步到手机。

## 版本

当前版本见 `manifest.json`（如 `2.1.0`）。

## 作者

- Terminal 改装：SakuraAho  
- 观测 / 相关玩法概念源自柚月小手机生态中的 N.A.V.I. 设定与思路

## License / 版权

本项目为个人二创，**保留作者权利，禁止商业化**。  
涉及 yuzuki-phone 的设计、命名与桥接能力，版权归原作者 **yuzuki** 所有。  
使用前请同时阅读 yuzuki-phone 仓库的版权声明。
