# Codex 云端 GitHub 项目

仓库内的 `.agents/skills/astra-deepseek-dev/` 可供云端任务发现；本机个人 skill 不会同步。
本包没有 Windows 用户路径、凭据或本机 profile，技能安装不等于双模型环境已配置。

对于 `sfwensnote/edu-skill-store-with-pbl`，应用根目录是 `main/`，先读仓库 `AGENTS.md`。
这是开发 Agent 技能，不是教学产品的 SKILL 方法，不改产品流程、数据库或学生模型配置。
保留应用既有 Node 版本及测试约定。Helper 需要 Node 24.15+，可以使用单独的已配置工具运行时；
不要为了运行 helper 修改应用 `.nvmrc`、锁文件或业务代码。

## 在当前云端会话检查

1. 主模型是否为 GPT-6 Astra，实际工具是否能派发指定的 DeepSeek 角色。
2. 云端是否已经配置相同 `custom/deepseek-v4.1-flash` 路由、模型目录和 provider 认证。
3. 路由所指的 Router 是否在该云端环境运行，或有用户批准且可达的受保护服务。
   Windows 本机 `127.0.0.1:4202` 指向用户电脑；在云端相同地址只指向云端 VM。
4. 环境网络策略是否允许服务目的地，环境自己的凭据是否可用。

原生精确角色可用时按宿主工具派发；若用户已在云端配置受支持的 Codex CLI profile，
可用同一 helper，并显式指定已核实的 `--profile`、`--provider`，仍固定同一个模型。
Helper 不会创建 cloud profile。不要上传 Windows 的 `auth.json`、caller-secret、
profile 文件或 Router 备份，不自动建立公网隧道。

无法满足时，输出缺少哪些条件和待批准环境设置；继续主 Agent 的规划及只读检查。
实施双模型任务前等待路由准备好，不能隐瞒后改用 GPT Worker。
若用户明确改为单模型执行，遵循该新选择并准确报告，不把它记作双模型验证成功。

## 本次连接边界

当前用户的中转地址是 HTTP 服务，本机已授权使用它。这个选择没有自动完成
Codex Cloud 的网络设置。官方网络 secret 的代理注入要求允许的 HTTPS 服务、443 端口；
因此当前 HTTP 中转不能直接按该网络 secret 方式配置。
如准备云端运行，先核对平台支持的认证/网络方案，并由用户在云端环境的私有设置中提供
所需认证，或由服务方提供受支持的 HTTPS 地址；不要在聊天索要密钥，也不要自动换到官方 API。
官方资料没有证明任意 Codex Cloud 会话都能接受自定义原生模型，必须以当前实际工具和请求为准。

## 仓库接入和验证

仅新增这个 skill 目录。它进入目标云端任务所检出的提交后，在新任务中调用：

> $astra-deepseek-dev 先检查云端主模型、DeepSeek 路由和工具，再规划并实施这个任务。

只要求检查时不发推理请求。配置完成后的真实小任务需要同时核对主会话模型、Worker
模型/角色或 CLI session、两次同会话回复、请求目的地和成功结果。
提交技能、配置环境和发布环境是不同操作；不把 PR 创建当作环境已发布。

来源（在修改云端配置或排查最新行为时重新核实）：
- [Cloud environments](https://learn.chatgpt.com/docs/environments/cloud-environments)
- [Codex environments](https://learn.chatgpt.com/docs/environments/modes)
- [Custom agents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
