# 部署指南 - 阿里云ECS

本指南介绍如何将任务管理应用部署到阿里云ECS服务器，并使用GitHub Actions实现自动部署。

## 部署架构

- **应用服务器**: 阿里云ECS (Ubuntu/CentOS)
- **部署方式**: GitHub Actions + SSH
- **进程管理**: systemd服务
- **Web服务器**: Gunicorn + Flask

## 前提条件

### 1. 阿里云ECS实例
- 已创建ECS实例（建议Ubuntu 20.04+ 或 CentOS 7+）
- 配置安全组，开放应用端口（默认5000）
- 获取ECS公网IP地址

### 2. 服务器配置
```bash
# 在ECS上执行
sudo apt update && sudo apt upgrade -y  # Ubuntu
# 或
sudo yum update -y  # CentOS

# 安装Python和相关工具
sudo apt install -y python3 python3-pip python3-venv git  # Ubuntu
sudo yum install -y python3 python3-pip git  # CentOS
```

### 3. SSH密钥配置
```bash
# 在本地生成SSH密钥对（如果还没有）
ssh-keygen -t rsa -b 4096 -f ~/.ssh/alicloud_ecs -N ""

# 将公钥添加到ECS的~/.ssh/authorized_keys
# 将以下公钥内容添加到ECS服务器：
cat ~/.ssh/alicloud_ecs.pub
```

## GitHub Secrets配置

在GitHub仓库设置中配置以下Secrets：

1. **ALICLOUD_SSH_PRIVATE_KEY**
   - 值：SSH私钥（完整的私钥内容，包括-----BEGIN RSA PRIVATE KEY-----和-----END RSA PRIVATE KEY-----）
   - 作用：用于SSH连接到ECS

2. **ALICLOUD_ECS_HOST**
   - 值：ECS实例的公网IP或域名
   - 示例：`123.123.123.123`

3. **ALICLOUD_ECS_USER**
   - 值：SSH用户名（通常是root或ecs-user）
   - 示例：`root` 或 `ubuntu`

4. **ALICLOUD_DEPLOY_PATH**
   - 值：应用部署目录
   - 示例：`/opt/taskmgmt`

5. **ALICLOUD_APP_PORT** (可选)
   - 值：应用监听的端口
   - 默认：`5000`

6. **ALICLOUD_ECS_PUBLIC_IP** (可选)
   - 值：ECS公网IP，用于部署后验证
   - 示例：`123.123.123.123`

## 配置步骤

### 步骤1: 配置GitHub Secrets
进入GitHub仓库 → Settings → Secrets and variables → Actions → New repository secret

### 步骤2: 推送代码触发部署
```bash
# 本地修改代码后
git add .
git commit -m "更新代码"
git push origin main
```

部署将自动触发。

### 步骤3: 验证部署
1. 查看GitHub Actions运行状态
2. 在ECS上检查服务状态：
   ```bash
   sudo systemctl status taskmgmt
   sudo journalctl -u taskmgmt -f  # 查看日志
   ```
3. 访问应用：`http://ECS_IP:5000`

## 手动部署（备用）

如果GitHub Actions部署失败，可以手动部署：

### 1. 本地准备部署包
```bash
# 克隆仓库
git clone https://github.com/gitdotkon/TaskMgmt.git
cd TaskMgmt

# 创建部署脚本
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e

DEPLOY_PATH="/opt/taskmgmt"
APP_PORT="5000"

echo "创建部署目录..."
sudo mkdir -p $DEPLOY_PATH
sudo chown -R $USER:$USER $DEPLOY_PATH

echo "复制文件..."
rsync -av --delete \
  --exclude='.git' \
  --exclude='venv' \
  --exclude='__pycache__' \
  ./ $DEPLOY_PATH/

cd $DEPLOY_PATH

echo "设置虚拟环境..."
python3 -m venv venv
source venv/bin/activate

echo "安装依赖..."
pip install --upgrade pip
pip install -r requirements.txt gunicorn

echo "创建服务文件..."
sudo tee /etc/systemd/system/taskmgmt.service > /dev/null << SERVICE_EOF
[Unit]
Description=Task Management Application
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DEPLOY_PATH
Environment="PATH=$DEPLOY_PATH/venv/bin"
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn \
  --bind 0.0.0.0:$APP_PORT \
  --workers 2 \
  app:app
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE_EOF

echo "启动服务..."
sudo systemctl daemon-reload
sudo systemctl enable taskmgmt
sudo systemctl restart taskmgmt

echo "✅ 部署完成"
EOF

chmod +x deploy.sh
```

### 2. 传输并执行
```bash
# 传输到ECS
scp -i ~/.ssh/alicloud_ecs -r . user@ecs_ip:/tmp/taskmgmt/

# SSH连接到ECS执行部署
ssh -i ~/.ssh/alicloud_ecs user@ecs_ip "cd /tmp/taskmgmt && bash deploy.sh"
```

## 故障排除

### 1. SSH连接失败
- 检查私钥格式是否正确
- 确认ECS安全组允许SSH（22端口）
- 验证用户名是否正确

### 2. 应用启动失败
```bash
# 查看应用日志
sudo journalctl -u taskmgmt -f

# 检查端口占用
sudo netstat -tlnp | grep :5000

# 测试应用
cd /opt/taskmgmt
source venv/bin/activate
python -c "from app import app; print('导入成功')"
```

### 3. 权限问题
```bash
# 确保部署目录权限正确
sudo chown -R $USER:$USER /opt/taskmgmt

# 检查systemd服务文件权限
sudo chmod 644 /etc/systemd/system/taskmgmt.service
```

### 4. 防火墙配置
```bash
# Ubuntu
sudo ufw allow 5000/tcp
sudo ufw reload

# CentOS
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

## 更新应用

代码推送到main分支后，GitHub Actions会自动：
1. 拉取最新代码
2. 传输到ECS
3. 重启服务

## 回滚

如果需要回滚到之前的版本：
```bash
# 在ECS上执行
cd /opt/taskmgmt
git checkout <commit_hash>
sudo systemctl restart taskmgmt
```

## 监控

### 查看服务状态
```bash
sudo systemctl status taskmgmt
```

### 查看应用日志
```bash
sudo journalctl -u taskmgmt -n 50 -f
```

### 访问统计
应用访问日志在：`/opt/taskmgmt/access.log`
错误日志在：`/opt/taskmgmt/error.log`

## 安全建议

1. **不要使用root用户部署**
   - 创建专用部署用户
   - 限制sudo权限

2. **配置防火墙**
   - 只开放必要端口
   - 限制IP访问范围

3. **定期更新**
   - 更新系统包
   - 更新Python依赖
   - 定期更换SSH密钥

4. **监控日志**
   - 设置日志轮转
   - 监控错误日志

## 扩展配置

### 使用Nginx反向代理
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 配置HTTPS
使用Let's Encrypt或阿里云SSL证书。

---

**提示**: 首次部署建议先手动测试部署脚本，确认无误后再配置GitHub Actions自动部署。