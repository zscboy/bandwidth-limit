#!/bin/bash

# 1. 查询限制的网速
# 2. 查询定时器是否开启
# 3. 停止定时器
# 4. 停止限速
# 5. 启动定时器

DEFAULT_INTERFACE="eth0"
INTERFACE=""

function getInterface() {
    INTERFACE=$(ip -o link show up | awk -F': ' '{print $2}' | while read iface; do [ "$(cat /sys/class/net/$iface/speed 2>/dev/null)" = "10000" ] && echo $iface; done)
    ## set default interface
    INTERFACE=${INTERFACE:-$DEFAULT_INTERFACE}
}

function queryBandwidthLimitStatus() {
    tc qdisc show dev "$INTERFACE" | grep -oP 'rate \K[^\s]+' || echo "unlimit"
}


function queryServiceStatus() {
    if systemctl is-active --quiet "bandwidth-limit" ; then
        echo "active"
    else
        echo "inactvie"
    fi
}

function stopTimer() {
    systemctl stop bandwidth-limit
}


function startTimer() {
    systemctl start bandwidth-limit
}

function queryStatus() {
    echo "网  口: $INTERFACE"
    echo "定时器: $(systemctl is-active bandwidth-limit)"
    echo "带  宽: $(queryBandwidthLimitStatus)"
}

function start() {
    startTimer
}

function stop() {
    stopTimer
    deleteBandwidthLimite
}

function main() {
    getInterface

    case "$1" in
    status)
        queryStatus
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    service_status)
        queryServiceStatus
        ;;
    bandwidth_limit_status)
        queryBandwidthLimitStatus
        ;;
    
    *)
    echo "Usage: $0 {status|start|stop|service_status|bandwidth_limit_status}"
    exit 1
    ;;
esac
}

main "$1"
