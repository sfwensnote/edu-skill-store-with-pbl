# 客户端内指挥

用户在 Codex 客户端选择 GPT-6 Astra，在项目会话中调用 `$astra-deepseek-dev`。
当前主会话不必切换到此前 CLI 专用 profile；本技能先看本会话的实际派发工具。

原生 `crack_builder` 可用且 provider 正确时，优先使用原生 Worker。若只提供 OpenAI
子模型或没有自定义角色，使用明确声明的 CLI Worker 路径。这是本技能的独立执行模式，
不是绕过 Codex on Crack 的原生角色检查；不要同时套用禁止外部 CLI 的原生 Worker 合同。
浏览器、计算机操作等客户端专属工具由主 Agent 完成，再把必要证据交给 Worker。

## 本机 CLI Worker

现有专用配置名 `crack-astra-relay`，Worker provider `codex-router-crack-worker`。
脚本只加载已配置的 profile，并在子进程固定 DeepSeek/high、禁用递归委派，
不会写 profile、创建凭据、切换系统代理或更改默认模型。

选择现有 Node 24.15+。若 PATH 中是旧 Node，在 Windows 可检查用户目录下
`.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`；
只在该命令使用它，不升级项目 `.nvmrc` 或系统运行时。

预检（不调用模型）：

```sh
node SKILL_DIR/scripts/worker.mjs check --project PROJECT_ROOT
```

把 `SKILL_DIR` 和 `PROJECT_ROOT` 换成当前 skill 与项目的真实路径，正确引用路径。
使用 shell 提供的安全文件写入工具创建任务目录及 brief，不能把提示拼接成 shell 命令。
任务目录应位于项目内、供任务私有使用；不要放进 `.git`、`.codex` 或 `node_modules`。
保存操作前 Git 状态以供主 Agent 验收。

执行用户已授权的开发任务：

```sh
node SKILL_DIR/scripts/worker.mjs run --project PROJECT_ROOT --brief TASK_DIR/brief.md --run-dir TASK_DIR
```

脚本固定模型/provider/effort，默认 `workspace-write`，不提供绕过沙箱选项。
若该任务只读，加 `--read-only`。按照宿主规则处理执行权限；不把授权失败当作理由改用 yolo。
运行通过 shell 工具启动后保持其 session ID，使用宿主等待/轮询工具等待；不重复派发。
脚本生成 `worker-events.jsonl`、`worker-result.md` 和 `worker-run.json`。
它们可能包含项目正文，应放在任务私有目录，交付前检查未跟踪文件，不自动提交这些日志。

修正必须沿用同一 CLI 会话并使用新的任务输出目录：

```sh
node SKILL_DIR/scripts/worker.mjs run --project PROJECT_ROOT --brief NEW_TASK_DIR/followup.md --run-dir NEW_TASK_DIR --resume SESSION_UUID
```

`worker-run.json` 的 session ID 来自真实 CLI `thread.started` 事件。模型/provider 配置字段
表示请求意图；实际身份需匹配该会话的 `turn_context` 和本机 Router 请求记录。
Router 的独立 CLI 请求不必有原生子 Agent 标记。

若预检报 profile/provider 缺失，说明具体缺口，生成配置预览再获得授权；不自动重新安装
Router，不复制用户登录文件，不以其他模型执行。
