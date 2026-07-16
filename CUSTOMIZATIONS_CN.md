# Dify 1.14.2 教学平台定制说明

## 基线与分支

- 官方基线：`langgenius/dify` tag `1.14.2`，提交 `7f392b695`。
- 定制仓库：`yuxehi/dify`。
- 后续开发分支：`dev_yyf`。不要在其他分支继续教学平台改造。
- 工作目录：`D:\dify_znt\dify1.14.2`。
- Python 要求：官方 1.14.2 要求 Python `~=3.12.0`。当前本机 `dify-env` 是 3.11.15，部署或执行后端测试前必须升级/重建该环境。

## 不可变的外部兼容契约

教学平台代码无需修改。后续维护以下接口时，不得自行修改路径、参数、状态码或 JSON 字段。

### 学生开户与登录

```text
GET /console/api/apps/user?name=<姓名>&email=<邮箱>
301 Location: <Dify地址>/signin?email=<邮箱>&teaching_ticket=<一次性票据>
```

- 首次访问创建账号，已有账号则补齐 Tenant 成员关系。
- 固定密码继续使用 `Ydt@12345`。
- 学生加入 Tenant `6169e57c-065f-4170-8411-d13b1363ad3f`，角色为 `editor`。
- 教学平台仍只需调用原来的 GET 接口，不需要读取或处理新增票据，现有平台代码无需修改。
- 301 状态码和 `email` 参数保留；响应增加 `no-store`，避免浏览器缓存带有已消费票据的永久重定向。
- Dify 登录页在同源页面内用票据换取 Access/Refresh Token，并将学生 Token 存入当前标签页的 `sessionStorage`；后续 Console API 使用 `Authorization: Bearer`。
- 票据默认 60 秒过期、只能原子消费一次，Access/Refresh Token 不进入 URL、历史记录或 Referrer。
- Owner/Admin 不允许走学生入口，既不能获得 iframe 票据，也不会被覆盖成 `editor`；管理员继续从 Dify 登录页直接登录。
- 固定密码作为兼容配置保留，但新的 iframe 主链路不再把密码交给浏览器。
- Web 容器设置 `NEXT_PUBLIC_ALLOW_EMBED=true`，关闭官方对 Console 页面添加的 `X-Frame-Options: DENY`。

### 双登录态兼容方案

| 使用者 | 入口 | 登录态 | CSRF 行为 |
| --- | --- | --- | --- |
| 管理员 | 直接访问 Dify 登录页 | 官方 HttpOnly Cookie，`SameSite=Lax` | 保留官方 CSRF 校验 |
| 学生 | 教学平台跨站 iframe | 一次性票据换取 Bearer Token | Bearer-only 请求不要求 Cookie CSRF；JWT 仍照常校验 |

两套方式按“请求是否仅携带 Bearer Token”自动区分，不改变已有 Console API 的路径、参数和响应结构。普通 Fetch、文件上传 XHR、SSE、keepalive 请求和 Workflow 协作 WebSocket 均已接入学生 Bearer Token。

部署协议兼容性：

| 教学平台 | Dify | 结果 |
| --- | --- | --- |
| HTTPS | HTTPS | 支持，生产推荐 |
| HTTP | HTTPS | 支持 |
| HTTP | HTTP | 功能可用，但明文传输 Token，不建议用于生产 |
| HTTPS | HTTP | 浏览器会拦截 mixed content，不支持；当前部署场景已确认不会出现 |

由于两套系统位于完全不同站点，方案不依赖共同主域名，也不依赖第三方 Cookie。`TEACHING_IFRAME_COOKIE_SAMESITE_NONE` 已废弃并默认关闭；不要再把管理员 Cookie 全局改成 `SameSite=None`。

### Token 回传

```text
POST https://www.suitanglian.com:3019/api/setAgentTokens
Content-Type: application/json

{"email":"student@example.com","total_tokens":123}
```

- 普通消息统计 `message_tokens + answer_tokens`。
- Workflow 使用 `total_tokens`，完成、失败或停止后只要存在消耗都应回传。
- Token 归属应用创建人，与 1.0.1 一致。
- 回传通过 Celery 异步执行，不阻塞 Dify 主请求；Redis 按消息/Workflow ID 去重并重试。
- 外部请求体仍只有 `email` 和 `total_tokens`，没有新增字段。

### 教学平台文件

```text
GET /console/api/fileList?email=<当前登录学生邮箱>
```

代理请求保持为：

```json
{
  "funcName": "GetFileList",
  "options": { "email": "student@example.com" }
}
```

外部地址为：

```text
https://www.suitanglian.com:3019/api/ai_general_education/unifiedUtilFunction_PPT
```

1.14.2 增加了当前登录账号邮箱校验，能阻止学生横向读取其他人的文件，但不会影响教学平台正常调用。

## 当前修改点与代码位置

### 1. 集中配置

- `api/configs/extra/teaching_platform_config.py`
- `api/configs/extra/__init__.py`
- `docker/.env.example`
- `docker/envs/core-services/shared.env.example`

所有域名、Tenant、固定密码、超时和源文件保留策略都通过 `TEACHING_*` 环境变量集中管理。默认值保留 1.0.1 行为，以支持无缝迁移。

### 2. 自动开户和自动登录

- `api/controllers/console/app/app.py`
- `api/services/teaching_platform_service.py`
- `web/app/signin/components/mail-and-password-auth.tsx`
- `api/libs/token.py`

账号创建和 Tenant 加入改用 1.14.2 官方 `AccountService`、`TenantService`，不再复制密码哈希等底层实现。

新增的关键认证位置：

- `api/controllers/console/auth/login.py`：学生票据兑换与 Refresh Token 轮换。
- `api/libs/token.py`：Cookie 优先、Bearer 兼容以及两种请求的 CSRF 分流。
- `api/controllers/console/socketio/workflow.py`：学生 Workflow WebSocket 的 Bearer 握手。
- `web/service/teaching-auth.ts`：标签页级学生 Token 存储。
- `web/service/fetch.ts`、`web/service/base.ts`、`web/service/refresh-token.ts`：Fetch、XHR、SSE 与刷新链路。

安全边界说明：`/console/api/apps/user` 为兼容旧教学平台，仍是无需 Dify 登录态的受信任入口。生产环境应在网关或防火墙按教学平台服务器 IP 限制该路径；否则任何能访问该地址的人都可以为任意非管理员邮箱创建学生账号并取得一次性票据。此项加固不需要修改教学平台代码。

### 3. 学生应用隔离

- `api/services/app_service.py`

教学模式下，Editor 仅查询 `App.created_by == 当前用户`；Owner/Admin 保留完整 Tenant 视图。该行为修复了 1.0.1 中管理员也被创建人条件限制的问题。

### 4. Token 异步回传

- `api/events/event_handlers/report_teaching_usage_when_message_created.py`
- `api/events/event_handlers/__init__.py`
- `api/tasks/report_teaching_token_usage_task.py`
- `api/tasks/workflow_execution_tasks.py`

不要把外部 HTTP 调用重新放回消息生成或 Workflow 主链路。

### 5. 教学文件选择与源文件保护

- `api/controllers/console/datasets/teaching_file_list.py`
- `api/controllers/console/__init__.py`
- `web/service/teaching-file-list.ts`
- `web/models/datasets.ts`
- `web/app/components/datasets/create/teaching-file-chooser/index.tsx`
- `web/app/components/datasets/create/step-one/index.tsx`
- `api/tasks/clean_document_task.py`
- `api/tasks/batch_clean_document_task.py`
- `api/tasks/clean_dataset_task.py`

学生选择的是平台已经存在的 `UploadFile.id`，不会重复上传。删除知识库/文档时保留原始平台文件；1.14.2 新增的分段图片和附件仍按官方逻辑清理，避免 1.0.1 那样无限保留全部衍生文件。

### 6. 学生界面裁剪

- `web/app/components/header/index.tsx`
- `web/app/components/apps/list.tsx`
- `web/app/components/apps/new-app-card.tsx`
- `web/app/components/app/create-app-modal/index.tsx`
- `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/layout-main.tsx`

Editor 学生保留应用、知识库和应用配置/Workflow 编辑，并允许创建文本生成应用；工作室顶部保留官方完整的应用类型筛选（全部、工作流、Chatflow、聊天助手、Agent、文本生成）。隐藏工作区切换、Explore、Tools、插件、环境变量、账号管理、模板、DSL、API、日志和 Overview。学生右上角沿用 Dify 1.0.1 的头像、用户名和下拉箭头按钮外观（移动端只显示头像），便于确认教学平台自动注入的身份，但不会渲染账号设置或退出菜单。Owner/Admin（Manager）保留官方完整界面。

管理员的成员设置页在前端按每页 20 人分页。成员接口仍返回完整列表，因此教学平台接口、成员总数、套餐上限判断和成员选择器不受影响。

学生端进一步裁剪以下入口，管理员端不受影响：

- 模型选择器隐藏“在插件市场发现更多”和“模型供应商设置”。
- Workflow 添加工具隐藏“精选推荐”和“在 Marketplace 中查找更多”。
- 知识库列表隐藏“通过知识流水线创建知识库”和“连接外部知识库”，只保留普通知识库创建。
- 学生知识库列表隐藏“外部知识库 API”按钮及面板入口，“全部标签”和搜索框作为一组靠右排列；管理员仍保留外部 API 管理功能。
- 学生知识库列表不渲染底部“你知道吗？”整块推广说明，避免残留文字或空白；管理员端保留官方 Footer。
- 普通知识库创建页参照 1.0.1 的紧凑文件选择流程重新设计：学生只从教学平台选择课程文件，可查看、移除和重新选择已选文件，再进入分段与索引设置；不再沿用造成大片空白的 1.14.2 双栏数据源框架。
- 学生应用卡片的“创建空白应用”和知识库卡片的“创建知识库”沿用 Dify 1.0.1 的卡片效果：前者为无额外边框的上下居中图标与文字，后者为左上虚线图标框、标题和底部说明文字；管理员的多入口卡片继续使用 1.14.2 紧凑列表。

界面隐藏不是完整的后端授权边界。应用列表的学生隔离由后端保证；其他管理接口仍依赖 Dify 官方角色鉴权。

### 7. 构建与部署

- `.github/workflows/build-push.yml`：只在 `dev_yyf` 构建 `yuxehi/dify`，默认发布 `xuut/dify-api` 与 `xuut/dify-web`。
- `api/Dockerfile`、`web/Dockerfile`：使用国内包镜像，但版本仍由锁文件固定。
- `docker/docker-compose.yaml`：使用教学镜像、默认 HTTPS，并将 PostgreSQL 默认仅绑定 `127.0.0.1`。
- `docker/ssrf_proxy/squid.conf.template`：允许非标准 HTTPS 端口，保证可访问教学平台的 `3019` 端口。
- 默认向量库已从 Weaviate 改为 Milvus：`VECTOR_STORE=milvus`，Compose 默认启用 `milvus` profile，并让 API/Worker 通过默认网络连接 `http://milvus-standalone:19530`。
- Milvus 保持官方 Dify 1.14.2 推荐的 `milvusdb/milvus:v2.6.3`，使用默认 `root/Milvus` 鉴权；没有移植 1.0.1 的 IVF_PQ、mmap 或 RC 版本配置。

## 明确未移植的旧修改

- 1.0.1 的聊天页状态、欢迎语和布局补丁未直接移植。1.14.2 已重构相关实现，应通过实际回归发现问题后再做最小修复。
- 1.0.1 的 Milvus 底层索引强制修改未移植，避免影响官方升级兼容性。
- 1.0.1 的 Python 兼容和零散源码修补未移植；以官方 1.14.2 实现为准。

## 部署前检查清单

1. 将 `dify-env` 重建为 Python 3.12，并按 `api/uv.lock` 安装依赖。
2. 从旧部署备份 PostgreSQL、Redis、对象存储/本地 storage 和插件数据。
3. 在测试副本执行官方 1.0.1 到 1.14.2 数据库迁移。
4. 确认固定 Tenant ID 在迁移后的数据库中存在。
5. 设置生产 `TEACHING_TENANT_ID`、`TEACHING_CONSOLE_URL` 和票据 TTL；由网关限制学生入口的来源 IP。
6. 配置 HTTPS 证书和域名，并在真实教学平台 iframe 中验证；不要部署成“教学平台 HTTPS + Dify HTTP”。
7. 使用固定学生测试首次开户、重复进入、自动登录、刷新页面和 Token 轮换。
8. 验证学生只能看到自己的应用，Owner/Admin 能直接登录并看到全部应用。
9. 分别验证 Chat、Agent、Workflow 成功/失败/停止的 Token 回传且不重复。
10. 验证文件列表只能查询本人，且能用平台文件创建知识库。
11. 删除文档和知识库后，确认源 UploadFile/存储对象存在，分段和衍生文件正常清理。
12. 检查 Milvus 2.6.3 的新建索引、检索、重启恢复和旧数据兼容性。
13. 镜像验证通过后再把生产环境切换到固定 tag/digest，不直接长期使用 `latest`。

## 已执行的本地验证

- Python 3.12 对所有新增/修改 Python 文件执行 `py_compile`：通过。
- `dify-env` 检查：确认 Python 3.11.15，不满足官方 1.14.2 要求。
- Web TypeScript 全量 `type-check`：通过。
- Node.js 22.22.1 下学生认证与 Workflow WebSocket 定向测试：10 项通过。
- Python 3.12 下 Token、票据服务和 Refresh Token 定向测试：19 项通过。
- Owner 邮箱访问学生入口返回 403，数据库中的 Owner 角色保持不变。
- 本地生产镜像构建并重建 API、Web、Worker、Beat、WebSocket、Nginx：通过。
- 无 Cookie 的 Bearer GET 请求返回 200；无 CSRF 的 Bearer POST 请求返回 200；响应不设置认证 Cookie。
- 修改过的 Web 文件 ESLint：无 error（保留的是官方文件原有风格 warning）。
- 受影响的应用创建、模型选择、Workflow 工具、知识库入口与 Step One 组件测试：103 项通过。
- Docker Compose `config --quiet`：通过。
- `git diff --check`：通过。

## 本地源码构建（开发模式）

开发机不再依赖 `xuut/dify-api:latest` 或 `xuut/dify-web:latest`。使用独立的
`docker/docker-compose.dev.yaml` 覆盖层，从当前 `dev_yyf` 工作目录构建 API
和 Web，并让 worker、beat、websocket 复用同一个本地 API 镜像：

```powershell
cd D:\dify_znt\dify1.14.2\docker
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d --build
```

代码修改后再次执行上述命令即可重建。只修改 API 时可缩小重建范围：

```powershell
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml build api
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d api worker worker_beat
```

本机旧版 Dify 已占用 PostgreSQL 宿主机端口 `5432`，因此 1.14.2 的本地
映射使用 `127.0.0.1:5433`；容器内部仍使用 `db_postgres:5432`，应用配置和
教学平台接口均不受影响。浏览器统一从 Nginx 入口访问
`http://localhost`，不要直接访问未映射到宿主机的 Web 容器端口 `3000`。

该模式使用 Docker 内的 Python 3.12 和 Node 22 构建当前源码，不依赖宿主机
现有的 Python 3.11 `dify-env`。它是可重复的源码构建开发模式，不提供源码
热更新；每次修改后需要重建对应镜像。
