# GitHub 提交与发布注意事项

本文面向后续维护 `yuxehi/dify` 教学平台定制版的开发人员。这个仓库的
`dev_yyf` 不是普通开发分支：推送后会自动构建并发布部署镜像，因此提交前必须
确认范围、完成验证，并避免把本地文件或半成品带入远端。

## 1. 固定仓库、目录和分支

- 本地工作目录：`D:\dify_znt\dify1.14.2`
- 定制远端：`origin = https://github.com/yuxehi/dify.git`
- 官方远端：`upstream = https://github.com/langgenius/dify.git`
- 教学平台持续开发分支：`dev_yyf`
- 官方 1.14.2 基线：`langgenius/dify` tag `1.14.2`

提交前先确认：

```powershell
cd D:\dify_znt\dify1.14.2
git branch --show-current
git remote -v
git status -sb
```

必须看到当前分支为 `dev_yyf`，并确认 push 目标是 `origin`。不要把教学平台修改
直接推送到 `upstream`，也不要在 `main` 或官方版本分支继续开发。

## 2. 每次 push 都会发布镜像

`.github/workflows/build-push.yml` 监听 `dev_yyf` 的 push。每次推送都会尝试：

- 构建 API amd64、API arm64；
- 构建 Web amd64、Web arm64；
- 向 Docker Hub 推送多架构镜像；
- 成功后更新 `xuut/dify-api:latest` 和 `xuut/dify-web:latest`（除非仓库变量覆盖镜像名）。

因此不要为了保存进度频繁 push，也不要推送尚未验证的临时提交。建议在本地完成
一组完整需求后一次提交、一次推送。推送后应检查 GitHub Actions，不能只看
`git push` 是否成功。

## 3. 先区分自己的改动和别人的改动

这个工作目录可能同时存在其他开发人员或用户留下的修改。提交前必须查看：

```powershell
git status -sb
git diff --name-only
git diff --check
```

原则：

- 不要默认使用 `git add -A` 或 `git add .`；
- 使用 `git add -- <明确的文件列表>`，只暂存本次需求文件；
- 未经确认不要修改、删除、暂存其他人的文件；
- `WINDOWS_BUILD_UBUNTU_DEPLOY_CN.md` 当前是本地部署资料，除非负责人明确要求，
  不要顺手加入功能提交；
- 暂存后再次执行 `git diff --cached --name-only` 和 `git diff --cached --stat`；
- 提交前用 `git diff --cached --check` 检查空白符错误。

如果状态中出现不认识的修改，先保留现场并询问负责人，不要通过 reset、checkout、
clean 等命令擅自恢复。

## 4. 提交前验证

验证范围要与改动风险相匹配，至少执行受影响文件的测试和静态检查。

### Web 修改

在 `web` 目录执行相关 Vitest：

```powershell
cd D:\dify_znt\dify1.14.2\web
node node_modules/vitest/vitest.mjs run <相关 spec 文件>
```

在仓库根目录执行相关文件的 Vite+ lint：

```powershell
cd D:\dify_znt\dify1.14.2
vp lint --deny-warnings <修改的 ts/tsx 文件>
```

较大改动还应执行仓库级类型检查或构建。不要只验证页面“能打开”，权限分支、窄屏
布局、学生/管理员差异都应有对应测试。

### API 修改

本项目要求 Python 3.12。当前约定环境为 `dify-env`：

```powershell
C:\Users\iveny\anaconda3\envs\dify-env\python.exe --version
C:\Users\iveny\anaconda3\envs\dify-env\python.exe -m ruff check <修改的 py 文件>
C:\Users\iveny\anaconda3\envs\dify-env\python.exe -m ruff format --check <修改的 py 文件>
C:\Users\iveny\anaconda3\envs\dify-env\python.exe -m pytest <相关测试文件> -q
```

如果定向测试不需要加载 API 根目录的完整 `conftest.py`，可按测试目录合理使用
`--confcutdir`；不能为了让测试变绿而绕开测试真正需要的 fixture。

## 5. 特别注意 pre-commit 与 C 盘空间

仓库 Git hooks 位于 `.vite-hooks`。当暂存区包含 `api/*.py` 时，pre-commit 会执行：

```text
uv run --project api --dev ruff check --fix ./api
uv run --project api --dev ruff check ./api
```

如果机器上没有已准备好的 uv 项目环境，这条命令会创建完整 API 虚拟环境并下载
大量开发依赖。uv 默认缓存位于：

```text
C:\Users\<用户名>\AppData\Local\uv\cache
```

一次完整解析可能占用约 2 GiB，曾经导致 C 盘空间持续下降。运行会触发 uv 的提交
前，先把环境和缓存显式放到 D 盘：

```powershell
$env:UV_CACHE_DIR = 'D:\dify_znt\.uv-cache'
$env:UV_PROJECT_ENVIRONMENT = 'D:\dify_znt\.venvs\dify-api'
$env:PATH = 'C:\Users\iveny\anaconda3\envs\dify-env\Scripts;' + $env:PATH
uv --version
```

这几个变量只对当前 PowerShell 会话生效，关闭窗口后需要重新设置。请确保 D 盘空间
足够，并保留锁文件约束，不要在提交时临时升级依赖。

如果 uv 已经意外写入 C 盘：

```powershell
uv cache dir
uv cache prune
```

优先使用 `prune` 清理不再使用的缓存。`uv cache clean` 会清空整个共享缓存，只有在
确认不会影响其他正在运行的任务时才可使用。删除虚拟环境前必须先确认其绝对路径，
不得对不确定的计算路径执行递归删除。

不建议常规使用 `git commit --no-verify`。只有在以下条件全部满足时才可应急使用：

1. 钩子只是因为本机环境或磁盘问题无法运行；
2. 已使用相同版本的 Ruff/Vite+ 手工完成等价检查；
3. 相关测试已经实际执行并通过；
4. 在提交记录或交接说明中写明跳过原因。

## 6. 推荐提交和推送流程

```powershell
cd D:\dify_znt\dify1.14.2

git fetch origin dev_yyf
git status -sb
git diff --check

# 只写本次确认过的文件，不要替换成 git add -A。
git add -- <文件1> <文件2> <测试文件>

git diff --cached --name-only
git diff --cached --stat
git diff --cached --check

git commit -m "feat: 简洁说明本次完整改动"
git push -u origin dev_yyf
```

如果 `git fetch` 后显示本地和远端已经分叉，不要强制 push。先确认远端的新提交来自
谁，再选择 merge 或 rebase。禁止使用 `git push --force` 覆盖 `dev_yyf`，除非仓库
负责人明确授权并已完成备份。

## 7. 推送后必须确认

先确认本地 HEAD 与远端分支指向同一个提交：

```powershell
git rev-parse HEAD
git ls-remote origin refs/heads/dev_yyf
git status -sb
```

然后检查 Actions：

```powershell
gh auth status
gh run list --workflow "Build and Push API & Web" --branch dev_yyf --limit 5
```

如需持续查看本次构建，取得 run ID 后执行：

```powershell
gh run watch <run-id>
```

只有 API/Web 四个平台构建和 manifest 创建全部成功，新的多架构 `latest` 镜像才算
发布完成。收到 GitHub “Some jobs were not successful” 邮件，表示镜像构建或发布失败，
不等于代码没有推到分支；应进入对应 run 查看第一个失败 job 的日志。

## 8. 提交说明应包含什么

交接时至少记录：

- 分支名和完整 commit SHA；
- 改了什么以及学生/管理员分别受什么影响；
- 是否改变教学平台既有接口；
- 执行过哪些测试、lint、类型检查或构建；
- GitHub Actions 和镜像发布是否成功；
- 哪些本地文件刻意没有提交；
- 是否跳过钩子，以及跳过原因和替代验证。

教学平台接口兼容、部署配置和功能改造的完整背景继续以
[`CUSTOMIZATIONS_CN.md`](./CUSTOMIZATIONS_CN.md) 为准。
