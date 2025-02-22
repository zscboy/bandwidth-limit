
const statusDiv = document.getElementById('status');
const toggleButton = document.getElementById('toggleButton');
const addTimesButton = document.getElementById('addTimes');
const saveTimesButton = document.getElementById('saveTimes');
const saveBandwidthButton = document.getElementById('saveBandwidth');


const configPath = "/etc/bandwidth-limit/bandwidth_scheduler.json";  // JSON 配置路径
// const deamonPath = "/usr/local/bandwidth-limit/bandwidth_deamon.sh"

let timeSlots = [];

function updateStatus(config) {
    const netInterfaceLabel = document.getElementById("netInterface");
    const timerStatusLabel = document.getElementById("timerStatus");
    const currentStatusLabel = document.getElementById("currentStatus");
    const requireBandwidthStatusLabel = document.getElementById("requireBandwidthStatus");
    const currentBandwidthStatusLabel = document.getElementById("currentBandwidthStatus");

    requireBandwidthStatusLabel.textContent = config.rate
    currentStatusLabel.textContent = config.switch

    currentStatusLabel.style.color = "black";
    if (config.switch === "on") {
        currentStatusLabel.style.color = "green"
    }

    cockpit.spawn(['bash', '-c', "systemctl show --property=Environment bandwidth-limit.service | cut -d'=' -f3"])
        .then((data) => {
            let networkInterface = data.trim(); 
            if (networkInterface === "") {
                networkInterface = "unknow"
            }
            netInterfaceLabel.textContent  = networkInterface;
            cockpit.spawn(['bash', '-c', `tc qdisc show dev '${networkInterface}' | grep -oP 'rate \\K[^\\s]+' || echo '无限制'`])
                .then((data) => {
                    console.log("currentBandwidthStatusLabel:", data)
                    currentBandwidthStatusLabel.textContent  = data;
                }).catch((error) => {
                    currentBandwidthStatusLabel.textContent  = error;
                    currentBandwidthStatusLabel.style.color = "red";
                });
        }).catch((error) => {
            netInterfaceLabel.textContent  = error;
            netInterfaceLabel.style.color = "red";
        });
    
    cockpit.spawn(['bash', '-c', "systemctl is-active --quiet 'bandwidth-limit' && echo 'active' || echo 'inactive'"])
        .then((data) => {
            timerStatusLabel.textContent = data
        }).catch((error) => {
            timerStatusLabel.textContent = error
            timerStatusLabel.style.color = "red";
        });
}

function updateSwitchButton(switchStatus) {
    if (switchStatus === 'on') {
        toggleButton.textContent = "停止";
        toggleButton.style.color = "green";
    } else {
        toggleButton.textContent = "启动";
        toggleButton.style.color = "gray";
    } 
}

function startOrStop() {
	console.log("start or stop");
    cockpit.spawn(["cat", configPath])
    .then((data) => {
        config = JSON.parse(data);
        console.log("config:", config);
       
        if (config.switch === "on") {
            config.switch = "off"
        }else {
            config.switch = "on"
        }

        setConfig(config)
    }).catch(() => {
        console.log("无法加载配置文件");
    });
}

function setConfig(config) {
    console.log("set config", config)
    cockpit.spawn(["bash", "-c", `echo '${JSON.stringify(config, null, 4)}' > ${configPath}`])
    .then(() => {
        console.log("Save config success");
        reloadConfig();
    }).catch((err) => {
        console.error("Save config Failed:", err);
    });
}


function reloadConfig() {
    cockpit.spawn(['bash', '-c', 'systemctl restart bandwidth-limit'])
        .then(() => {
            loadConfig();
        });
}


function loadConfig() {
    cockpit.spawn(["cat", configPath])
        .then((data) => {
            config = JSON.parse(data);
            timeSlots = config.no_limit_times || [];
            updateStatus(config);
            updateSwitchButton(config.switch);
            displayTimeSlots();
	        console.log("config:", config);

        }).catch(() => {
            console.log("无法加载配置文件");
        });
}

function displayTimeSlots() {
    const container = document.getElementById("timeSlotsContainer");
    container.innerHTML = ""; // 清空现有内容
    console.log("timeSlots:",timeSlots);
    timeSlots.forEach((slot, index) => {
        let div = document.createElement("div");
        div.innerHTML = `
            <input type="time" value="${slot.start}" id="start_${index}">
            <input type="time" value="${slot.end}" id="end_${index}">
        `;
	
	let deleteButton = document.createElement("button");
        deleteButton.textContent = "删除";
        deleteButton.addEventListener("click", function () {
             removeTimeSlot(index, div);
        });

        div.appendChild(deleteButton);
        container.appendChild(div);
    });
}

function addTimeSlot() {
    let index = timeSlots.length; 
    timeSlots.push({ start: "", end: "" }); 
    let container = document.getElementById("timeSlotsContainer");

    let div = document.createElement("div");
    div.innerHTML = `
        <input type="time" id="start_${index}">
        <input type="time" id="end_${index}">
    `;
    
    let deleteButton = document.createElement("button");
    deleteButton.textContent = "删除";
    deleteButton.addEventListener("click", function () {
        removeTimeSlot(index, div);
    });

    div.appendChild(deleteButton);
    container.appendChild(div);
}

function removeTimeSlot(index) {
    timeSlots.splice(index, 1); 
    displayTimeSlots(); 
}

function saveTimes() {
    let updatedSlots = [];

    timeSlots.forEach((_, index) => {
        let start = document.getElementById(`start_${index}`).value;
        let end = document.getElementById(`end_${index}`).value;
        if (start && end) {
            updatedSlots.push({ start, end });
        }
    });

    cockpit.spawn(["cat", configPath])
    .then((data) => {
        config = JSON.parse(data);
        config.no_limit_times = updatedSlots;
        setConfig(config);
    }).catch(() => {
        console.log("无法加载配置文件");
    });
}

function saveBandwidth() {
    let newBandwidth = document.getElementById("setBandwidth").value;
    if (newBandwidth.trim() !== "" && newBandwidth.includes("Mbit")) {
        cockpit.spawn(["cat", configPath])
            .then((data) => {
                config = JSON.parse(data);
                config.rate = newBandwidth;
                setConfig(config);
            }).catch(() => {
                console.log("无法加载配置文件");
            });
    } else {
        alert("请输入有效的带宽值！");
    }

}

toggleButton.addEventListener("click", startOrStop);
addTimesButton.addEventListener("click", addTimeSlot);
saveTimesButton.addEventListener("click", saveTimes);
saveBandwidthButton.addEventListener("click", saveBandwidth);


// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() {
   loadConfig();
});
