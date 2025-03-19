#!/bin/bash


install_bandwidth_limit() {
    ### 检查frpc是否存在
    if systemctl list-units --type=service --all | awk '{print $1}' | grep -x "bandwidth-limit.service"; then
        echo "bandwidth-limit.service exists"
    else
        echo "bandwidth-limit.service does not exist, install..."

        # 下载 zip 文件
        wget -O /tmp/bandwidth-limit.zip https://codeload.github.com/zscboy/bandwidth-limit/zip/refs/tags/0.0.1

        # 进入 /usr/local 目录
        cd /usr/local

        # 解压 zip 文件，并去掉版本号
        unzip /tmp/bandwidth-limit.zip
        mv bandwidth-limit-0.0.1 bandwidth-limit

        # install tc web
        mkdir -p /root/.local/share/cockpit
        ln -s /usr/local/bandwidth-limit/web /root/.local/share/cockpit/tc

        ## 保留原配置
        mkdir -p /etc/bandwidth-limit
        cp -n bandwidth-limit/bandwidth_scheduler.json /etc/bandwidth-limit

        ###TODO　创建web软连接
        # 清理临时文件
        rm /tmp/bandwidth-limit.zip

        ###　get interface
        interface=$(ip -o link show up | awk -F': ' '{print $2}' | while read iface; do [ "$(cat /sys/class/net/$iface/speed 2>/dev/null)" = "10000" ] && echo $iface; done)
        ## set default interface eth0
        interface=${interface:-eth0}

        SERVICE_FILE="/etc/systemd/system/bandwidth-limit.service"
        cat >$SERVICE_FILE <<EOF
[Unit]
Description=My Bandwidth Control Service
After=network.target

[Service]
Environment="INTERFACE=$interface"
ExecStart=/usr/bin/python3 -u /usr/local/bandwidth-limit/bandwidth_scheduler.py --config_file /etc/bandwidth-limit/bandwidth_scheduler.json --interface \${INTERFACE}
ExecStopPost=/usr/bin/python3 -u /usr/local/bandwidth-limit/bandwidth_scheduler.py --function unlimit_rate --interface \${INTERFACE}
StandardOutput=journal
StandardError=journal
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF


        systemctl enable bandwidth-limit
        systemctl start bandwidth-limit

    fi
}

update() {
    delete
    install_bandwidth_limit
}

delete() {
    systemctl stop bandwidth-limit
    systemctl disable bandwidth-limit

    rm /etc/systemd/system/bandwidth-limit.service
    rm -rf /root/.local/share/cockpit/tc
    rm -rf /usr/local/bandwidth-limit
}


function main() {
    case "$1" in
    install)
        install_bandwidth_limit
        ;;
    update)
        update
        ;;
    delete)
        delete
        ;;    
    *)
    echo "Usage: $0 {install|update|delete}"
    exit 1
    ;;
esac
}

main "$1"