# 善缘阁腾讯云部署

当前生产环境使用共享主机 Nginx：善缘阁容器只监听本机端口，由宿主机 Nginx 为 shanyuan.199305.icu 提供 HTTPS。不要使用独立 Nginx 配置抢占 80 或 443 端口。

## 目录与服务

- web：Next.js 前端，宿主机映射到 127.0.0.1:13000。
- api：Node API 兼容层，宿主机映射到 127.0.0.1:18790。
- mysql：自托管 MySQL 8.4，仅容器网络可访问。
- shanyuan_uploads：上传图片持久化卷。配置 COS 后会自动优先使用 COS。

## 首次配置

1. 仅在服务器创建 .env.tencent，权限设为 600。
2. 设置强随机 ADMIN_ACCESS_KEY、MySQL 密码及模型密钥。
3. 公开试运营当天设置 SITE_TRIAL_START_AT 为 UTC ISO 时间，例如 2026-07-22T00:00:00Z。
4. 生产环境保持 MOCK_PAYMENT=false、MOCK_SMS=false。试运营结束前，应接入支付或显式关闭收费入口。
5. COS 未配置时，应用会使用 /data/uploads 数据卷；该卷必须和数据库一起备份。

## 更新与启动

在 /opt/shanyuan 执行：

~~~bash
docker compose -p shanyuan --env-file .env.tencent \
  -f deploy/tencent/docker-compose.yml \
  -f deploy/tencent/docker-compose.existing-nginx.yml \
  -f deploy/tencent/docker-compose.self-hosted.yml \
  up -d --build
~~~

健康检查：

~~~bash
curl http://127.0.0.1:18790/api/health
curl https://shanyuan.199305.icu/api/health
~~~

两个检查均应显示数据库 ok，对象存储显示 cos 或 local 的 ok。

## 自动备份

部署后安装定时器：

~~~bash
chmod 700 deploy/tencent/backup.sh
cp deploy/tencent/shanyuan-backup.service /etc/systemd/system/
cp deploy/tencent/shanyuan-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now shanyuan-backup.timer
systemctl list-timers shanyuan-backup.timer
~~~

备份保存在 /opt/shanyuan/backups，默认保留 14 天，包含 MySQL、上传图片及校验和。该备份仍在同一台服务器，正式运营前还应同步到 COS 或其他独立存储。

## 安全与维护

- .env.tencent、SSH 私钥、发布压缩包只能留在服务器或本机临时目录，不能提交 Git。
- 上线后移除临时部署 SSH 公钥，改用受控运维账号或受限部署密钥。
- 仅在确认不影响其他项目构建后，执行 docker builder prune -af 清理构建缓存；不要使用会删除卷的 Docker 清理命令。

## GitHub 自动部署

仓库中的 `.github/workflows/tencent-deploy.yml` 会在 `main` 分支收到推送后执行：先运行类型检查与生产构建，再同步源码、重建 Web/API 容器，并检查内网和公网健康接口。

在 GitHub 仓库的 **Settings -> Secrets and variables -> Actions** 中创建一个仓库 Secret：

- `TENCENT_DEPLOY_KEY`：部署私钥完整内容，不是 `.pub` 公钥。

当前工作流已固定腾讯云服务器地址、端口、`root` 部署用户及 SSH 主机公钥；若未来更换服务器，应同时更新工作流中的这四项值，并改用受限的专用部署用户。

工作流只同步版本库中的应用源码；会保留服务器的 `.env.tencent`、MySQL 数据卷、上传文件卷、`backups/` 目录及已启用的备份定时器配置。不要在 GitHub Secrets 或仓库中保存模型密钥、数据库密码或 `.env.tencent`。