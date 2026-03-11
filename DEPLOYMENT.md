# 部署指南

## GitHub Actions 自动部署到阿里云 ECS

### 前置要求

1. 阿里云 ECS 实例
2. GitHub 仓库
3. SSH 密钥对

### 配置步骤

#### 1. 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets（Settings → Secrets and variables → Actions → New repository secret）：

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `ALICLOUD_SSH_PRIVATE_KEY` | SSH 私钥内容（完整的私钥文件内容） | `-----BEGIN OPENSSH PRIVATE KEY-----\n...` |
| `ALICLOUD_ECS_HOST` | ECS 公网 IP 或域名 | `47.xxx.xxx.xxx` |
| `ALICLOUD_ECS_USER` | SSH 登录用户名 | `root` 或 `ubuntu` |
| `ALICLOUD_DEPLOY_PATH` | 应用部署路径（可选，默认 `/opt/taskmgmt`） | `/opt/taskmgmt` |
| `ALICLOUD_APP_PORT` | 应用运行端口（可选，默认 `5001`） | `5001` |

#### 2. 生成 SSH 密钥对（如果还没有）

```bash
# 在本地生成 SSH 密钥对
ssh-keygen -t ed25519 -C "github-actions@deploy" -f ~/.ssh/github_deploy_key

# 查看公钥（需要添加到 ECS）
cat ~/.ssh/github_deploy_key.pub

# 查看私钥（需要添加到 GitHub Secrets）
cat ~/.ssh/github_deploy_key
```

#### 3. 配置 ECS 服务器

```bash
# 登录到 ECS
ssh user@your-ecs-ip

# 添加公钥到 authorized_keys
echo "your-public-key-content" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# 确保 sudo 权限（如果使用非 root 用户）
# 编辑 sudoers 文件
sudo visudo
# 添加以下行（将 username 替换为实际用户名）
username ALL=(ALL) NOPASSWD: ALL
```

#### 4. 测试 SSH 连接

```bash
# 在本地测试 SSH 连接
ssh -i ~/.ssh/github_deploy_key user@your-ecs-ip "echo 'Connection successful'"
```

### 部署流程

1. **推送代码到 main 分支**
   ```bash
   git add .
   git commit -m "Update application"
   git push origin main
   ```

2. **GitHub Actions 自动执行**
   - 检查代码
   - 验证 Python 语法
   - 验证 Secrets 配置
   - 建立 SSH 连接
   - 传输文件到 ECS
   - 执行部署脚本
   - 验证部署状态

3. **手动触发部署**
   - 访问 GitHub 仓库的 Actions 页面
   - 选择 "Deploy to Alibaba Cloud ECS" workflow
   - 点击 "Run workflow"

### 部署脚本说明

部署脚本 `scripts/deploy.sh` 会自动执行以下操作：

1. 安装 Python 和依赖
2. 创建虚拟环境
3. 安装应用依赖
4. 配置 systemd 服务
5. 启动应用服务
6. 配置防火墙规则

### 管理命令

在 ECS 上管理应用：

```bash
# 查看服务状态
sudo systemctl status taskmgmt

# 查看日志
sudo journalctl -u taskmgmt -f

# 重启服务
sudo systemctl restart taskmgmt

# 停止服务
sudo systemctl stop taskmgmt

# 启动服务
sudo systemctl start taskmgmt
```

### 故障排查

#### 1. SSH 连接失败

检查：
- ECS 安全组是否开放 22 端口
- SSH 公钥是否正确添加到 ECS
- GitHub Secrets 中的私钥格式是否正确（包含完整的 BEGIN 和 END 标记）

#### 2. 部署失败

查看 GitHub Actions 日志：
- 访问仓库的 Actions 页面
- 点击失败的 workflow run
- 查看详细的错误信息

查看 ECS 上的日志：
```bash
sudo journalctl -u taskmgmt -n 50 --no-pager
```

#### 3. 应用无法访问

检查：
- ECS 安全组是否开放应用端口（默认 5001）
- 防火墙规则是否正确配置
- 应用是否正常运行

```bash
# 检查端口监听
sudo ss -tlnp | grep 5001

# 检查防火墙状态
sudo firewall-cmd --list-all
```

### 安全建议

1. **使用专用的 SSH 密钥** - 不要使用个人 SSH 密钥
2. **限制 SSH 访问** - 在 ECS 安全组中限制 SSH 访问来源
3. **定期轮换密钥** - 定期更新 SSH 密钥和 GitHub Secrets
4. **使用非 root 用户** - 创建专用的部署用户而不是使用 root
5. **启用防火墙** - 只开放必要的端口

### 访问应用

部署成功后，访问：
```
http://your-ecs-ip:5001
```

如果配置了域名和反向代理，可以通过域名访问。
