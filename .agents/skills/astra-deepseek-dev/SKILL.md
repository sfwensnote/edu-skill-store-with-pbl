---
name: astra-deepseek-dev
description: "用 GPT-6 Astra 规划与验收、已配置的 DeepSeek V4.1 Flash 实现测试，支持 Codex 客户端及仓库云端任务的开发编排。用于明确要求 Astra/DeepSeek 分工的开发任务，不用于教学产品中的 SKILL 方法封装。"
---

# Astra + DeepSeek 开发

保留当前会话作为主 Agent。用户指定的主模型是 `gpt-6-astra`，Worker 路由是
`custom/deepseek-v4.1-flash`、high，上游模型字段为 `deepseek-v4.1-flash`。
使用现有中转，不改成官方 `deepseek/` 路由，不添加备用模型。
Skill 不会切换会话模型；若当前主模型无法确认或不是 Astra，说明这一点，请用户在客户端
选择 Astra。可先做不依赖模型切换的项目检查，不假报主模型已切换。

## 先确定真实执行方式

读取项目 `AGENTS.md`、相关代码和 Git 状态，确认工作目录、现有修改及验收目标。
检查当前工具 schema 和角色配置，不把磁盘文件当作已加载的派发能力。

- 若当前会话实际提供 `crack_builder` 或明确允许所选 DeepSeek 路由，使用该原生角色，
  检查它固定的模型、provider 和 high，再按可用 schema 派发。已安装且匹配的
  Codex on Crack 可提供原生编排；不猜测 `subagent`、`spawn_agent` 的参数。
- 在本机客户端中，若没有原生 DeepSeek 派发能力，用户调用本技能也授权使用已配置的
  DeepSeek CLI Worker 执行当前开发任务。先说明采用 **CLI Worker**，按
  [客户端执行](references/desktop.md) 检查并调用 `scripts/worker.mjs`。
  它是独立 Codex CLI 会话，不是客户端原生子 Agent，也不继承客户端 MCP/浏览器工具。
  主 Agent 留在客户端负责决策和验收；不启动第二个 Astra 来替代它。
- Codex 云端任务读 [云端环境](references/cloud.md)。只能使用当前云端实际可用且
  已配置的 Worker；本机回环地址、登录、进程和技能不会自动转移过去。
  缺少精确路由、网络或认证时，继续规划及只读检查，报告阻塞；不自动换模型或
  声称云端双模型已接通。

## 分工与验收

主 Agent 确定方案、架构和最终验收。Worker 完成授权范围内的实现、测试、调试和常规修复。
简单任务可以直接处理，并明确未派发 Worker；复杂任务默认一个写入 Worker。
每次派发给出目标、必要上下文、允许修改的路径、依赖、验收检查和已存在的用户修改。
文件范围是任务合同，不是额外的操作系统沙箱；需要隔离时使用当前环境支持的 worktree，
未提交修改不会自动转移。

Worker 不调用本编排 skill、不继续委派、不更换模型、不改凭据，不自动提交、推送或部署。
主 Agent 等待实际完成；轮询超时不等于 Worker 失败，不因此重启或重叠两个写入任务。
审查全部 diff 和未跟踪文件，核对验收及真实测试；复用可信结果，只补查具体缺口。
需要修正时汇总反馈给同一个 Worker；原生会话用实际跟进工具，CLI 会话用记录的 session ID。

## 请求证据

区分“配置正确”“实际请求成功”“中转后端模型身份”。记录实际会话模型、provider、
线程/会话 ID、结果和必要的 Router 脱敏记录。Worker 自称模型或单独 HTTP 200 不足为证。
CLI Worker 的 `isSubagent` 可以为 false；不要把它的独立会话伪装为原生子线程。
安装和预检不调用付费模型；用户给出真实开发任务后才派发。仅要求检查/预览时不推理。
不在聊天、参数、日志、Git 中放密钥，也不自动上传登录文件、个人 profile 或 Router 备份。
报告完成内容、检查结果、实际执行方式、模型证据和剩余问题。
