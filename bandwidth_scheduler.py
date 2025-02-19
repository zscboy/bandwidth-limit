import subprocess
import datetime
import json
import argparse
import time
from datetime import datetime

# 获取目标速率
def get_target_rate(json_config):
    now = datetime.now().time()
    for timer in json_config["no_limit_times"]:
        start_time = datetime.strptime(timer["start"], "%H:%M").time()
        end_time = datetime.strptime(timer["end"], "%H:%M").time()
        if  start_time <= now <= end_time:
            print(f"{now} in [{start_time},{end_time}]")
            return None
        
    return json_config["rate"]

# 获取当前速率
def get_current_rate(interface):
    try:
        result = subprocess.check_output(f"tc qdisc show dev {interface} | grep -oP 'rate \K[^\s]+' || echo 'None'", shell=True, text=True).strip() 
        if result == "None":
            print(f"Bandwidth status: Unlimited")
            return None
        else:
            print(f"Bandwidth status: {result}")
            return result
    except subprocess.CalledProcessError:
        return None

# 限制带宽
def set_bandwidth_limit(interface, rate):
     print(f"set_bandwidth_limit {interface}:{rate}")
     try:
        subprocess.run(f"tc qdisc add dev {interface} root tbf rate {rate} burst 8192kbit latency 300ms", shell=True)
     except subprocess.CalledProcessError as e:
        print(f"set_bandwidth_limit error: {e}")


# 解除限速
def del_bandwidth_limit(interface):
    print(f"del_bandwidth_limit {interface}")
    try:
        subprocess.run(f"tc qdisc del dev {interface} root 2>/dev/null", shell=True)  # 删除旧规则
    except subprocess.CalledProcessError as e:
        print(f"del_bandwidth_limit error: {e}")


def print_unlimit_times(json_config):
    for timer in json_config["no_limit_times"]:
        start_time = datetime.strptime(timer["start"], "%H:%M").time()
        end_time = datetime.strptime(timer["end"], "%H:%M").time()
        print(f"{start_time}-{end_time}")

def handle_bandwidth(json_config, interface):
    # 判断crrent_rate是否与target_rate一样，不一样则修改，一样则不用修改
    print(f"no-limit-times:")
    print_unlimit_times(json_config)

    target_rate = get_target_rate(json_config)
    current_rate = get_current_rate(interface)
    if target_rate != current_rate:
        if current_rate != None:
            del_bandwidth_limit(interface)
        if target_rate != None:
            set_bandwidth_limit(interface, target_rate)
    else:
        print(f"Bandwith no change")

## get network interface
def get_first_macvtap_interface():
    try:
        # 执行 `ip link` 命令，获取所有网络接口信息
        result = subprocess.check_output("ip link", shell=True, text=True)
        # 筛选包含 "macvtap" 的行并返回第一个接口名
        macvtap_interfaces = [line.split(":")[1].strip().split('@')[0] for line in result.splitlines() if "macvtap" in line]
        return macvtap_interfaces[0] if macvtap_interfaces else None
    except subprocess.CalledProcessError as e:
        print(f"Error occurred: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="Manage bandwidth based on time intervals.")
    parser.add_argument("--config_file", help="Path to the JSON configuration file.")
    parser.add_argument("--function", choices=["handle_bandwidth", "unlimit_rate"], default="handle_bandwidth", help="Select the function to execute")
    parser.add_argument("--interface", help="Network interface to limit bandwidth.")


    args = parser.parse_args()
    
    interface = args.interface
    if interface == None:
        interface = get_first_macvtap_interface()

    if interface == None:
        print(f"error: the following arguments are required: --interface")
        return


    if args.function == "unlimit_rate":
        # Remove bandwidth limit
        del_bandwidth_limit(interface) 
        print(f"Bandwidth limit removed.")
        # Exit after removing the limit
        return 

    if args.config_file == None:
        print(f"error: the following arguments are required: --config_file")
        return

    while True:
        with open(args.config_file, "r") as f:
            json_config = json.load(f)

        handle_bandwidth(json_config, interface)
        # 每隔 60 秒执行一次
        time.sleep(60)



if __name__ == "__main__":
    main()