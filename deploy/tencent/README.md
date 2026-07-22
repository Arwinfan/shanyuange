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