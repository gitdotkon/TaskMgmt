#!/bin/bash
# 任务管理应用部署脚本
# 在阿里云ECS上执行此脚本以部署或更新应用

set -e  # 遇到错误时退出

# 默认配置
DEFAULT_DEPLOY_PATH="/opt/taskmgmt"
DEFAULT_APP_PORT="5000"
DEFAULT_USER="$USER"

# 使用参数或默认值
DEPLOY_PATH="${1:-$DEFAULT_DEPLOY_PATH}"
APP_PORT="${2:-$DEFAULT_APP_PORT}"
SERVICE_USER="${3:-$DEFAULT_USER}"
SERVICE_NAME="taskmgmt"

echo "=== 任务管理应用部署脚本 ==="
echo "部署路径: $DEPLOY_PATH"
echo "应用端口: $APP_PORT"
echo "服务用户: $SERVICE_USER"
echo "服务名称: $SERVICE_NAME"
echo "=========================="

# 检查Python3
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3未安装"
    echo "安装Python3:"
    echo "  Ubuntu: sudo apt install python3 python3-pip python3-venv"
    echo "  CentOS: sudo yum install python3 python3-pip"
    exit 1
fi

# 创建部署目录
echo "创建部署目录: $DEPLOY_PATH"
sudo mkdir -p $DEPLOY_PATH
sudo chown -R $SERVICE_USER:$SERVICE_USER $DEPLOY_PATH

# 检查是否在部署目录中运行
if [ ! -f "app.py" ]; then
    echo "警告: 当前目录中未找到app.py"
    echo "请确保在项目根目录中运行此脚本"
    echo "或手动将文件复制到: $DEPLOY_PATH"
fi

# 如果当前目录有文件，复制到部署目录
if [ -f "app.py" ] && [ -f "requirements.txt" ]; then
    echo "复制应用文件到部署目录..."
    rsync -av --delete \
        --exclude='.git' \
        --exclude='.github' \
        --exclude='venv' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='*.log' \
        ./ $DEPLOY_PATH/
else
    echo "跳过文件复制，假设文件已在部署目录中"
fi

cd $DEPLOY_PATH

# 设置Python虚拟环境
echo "设置Python虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# 安装/更新依赖
echo "安装Python依赖..."
pip install --upgrade pip
pip install -r requirements.txt

# 安装gunicorn（如果未安装）
if ! pip show gunicorn &> /dev/null; then
    echo "安装gunicorn..."
    pip install gunicorn
fi

# 创建或更新systemd服务文件
echo "配置systemd服务..."
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# 检查服务文件是否存在，如果存在则备份
if [ -f "$SERVICE_FILE" ]; then
    echo "备份现有服务文件..."
    sudo cp "$SERVICE_FILE" "$SERVICE_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# 创建服务文件
echo "创建服务文件: $SERVICE_FILE"
sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Task Management Application
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$DEPLOY_PATH
Environment="PATH=$DEPLOY_PATH/venv/bin"
Environment="PYTHONUNBUFFERED=1"

# 应用启动命令
ExecStart=$DEPLOY_PATH/venv/bin/gunicorn \\
  --bind 0.0.0.0:$APP_PORT \\
  --workers 4 \\
  --threads 2 \\
  --worker-class sync \\
  --access-logfile $DEPLOY_PATH/access.log \\
  --error-logfile $DEPLOY_PATH/error.log \\
  --log-level info \\
  --timeout 120 \\
  app:app

# 重启策略
Restart=on-failure
RestartSec=10
StartLimitInterval=60
StartLimitBurst=3

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$DEPLOY_PATH

[Install]
WantedBy=multi-user.target
EOF

# 设置服务文件权限
sudo chmod 644 "$SERVICE_FILE"

# 重载systemd配置
echo "重载systemd配置..."
sudo systemctl daemon-reload

# 启用服务（开机自启）
echo "启用服务..."
sudo systemctl enable $SERVICE_NAME

# 重启服务
echo "重启服务..."
sudo systemctl restart $SERVICE_NAME

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo "检查服务状态..."
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务启动失败"
    sudo systemctl status $SERVICE_NAME --no-pager
    exit 1
fi

# 检查端口监听
echo "检查端口 $APP_PORT 监听状态..."
if sudo ss -tlnp | grep ":$APP_PORT" > /dev/null; then
    echo "✅ 应用已在端口 $APP_PORT 成功监听"
else
    echo "⚠️  端口 $APP_PORT 未监听，检查服务日志..."
    sudo journalctl -u $SERVICE_NAME -n 20 --no-pager
    exit 1
fi

# 显示服务信息
echo ""
echo "=== 部署完成 ==="
echo "应用目录: $DEPLOY_PATH"
echo "服务状态: $(sudo systemctl is-active $SERVICE_NAME)"
echo "服务日志: sudo journalctl -u $SERVICE_NAME -f"
echo "访问应用: http://$(hostname -I | awk '{print $1}'):$APP_PORT"
echo "或: http://localhost:$APP_PORT"
echo ""
echo "常用命令:"
echo "  查看状态: sudo systemctl status $SERVICE_NAME"
echo "  查看日志: sudo journalctl -u $SERVICE_NAME -f"
echo "  重启服务: sudo systemctl restart $SERVICE_NAME"
echo "  停止服务: sudo systemctl stop $SERVICE_NAME"
echo "=========================="

# 可选：创建简单的健康检查
echo "创建健康检查脚本..."
cat > $DEPLOY_PATH/health_check.sh << 'HEALTH_EOF'
#!/bin/bash
# 健康检查脚本
PORT=${1:-5000}
TIMEOUT=5

# 检查端口是否监听
if ss -tln | grep ":$PORT" > /dev/null; then
    # 尝试HTTP请求
    if command -v curl &> /dev/null; then
        if curl -s -f --max-time $TIMEOUT "http://localhost:$PORT" > /dev/null; then
            echo "OK - Application is running on port $PORT"
            exit 0
        else
            echo "WARNING - Port $PORT is listening but HTTP request failed"
            exit 1
        fi
    else
        echo "OK - Port $PORT is listening (curl not available for HTTP check)"
        exit 0
    fi
else
    echo "CRITICAL - Port $PORT is not listening"
    exit 2
fi
HEALTH_EOF

chmod +x $DEPLOY_PATH/health_check.sh
echo "健康检查脚本: $DEPLOY_PATH/health_check.sh"

exit 0