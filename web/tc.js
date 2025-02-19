
const statusDiv = document.getElementById('status');
const toggleButton = document.getElementById('toggleButton');
const addTimesButton = document.getElementById('addTimes');
const saveConfigButton = document.getElementById('saveConfig');

const configPath = "/etc/bandwidth-limit/bandwidth_scheduler.json";  // JSON 配置路径
const deamonPath = "/usr/local/bandwidth-limit/bandwidth_deamon.sh"

let timeSlots = [];
let rate = "";

function updateStatus() {
        cockpit.spawn(['bash', '-c', deamonPath + ' status'])
            .then((data) => {
                statusDiv.innerHTML = `<pre>${data}</pre>`;
            })
            .catch((error) => {
                statusDiv.innerHTML = `<pre>Error: ${error}</pre>`;
                statusDiv.style.color = "red";
            });



}

function setbutton() {
	cockpit.spawn(['bash', '-c', deamonPath + ' service_status'])
            .then((data) => {
		console.log("data", data)
		if (data.trim() === 'active') {
                   toggleButton.textContent = "停止";
                   toggleButton.style.color = "green";

                } else {
                   toggleButton.textContent = "启动";
                   toggleButton.style.color = "green";
		} 

            })
	    .catch((error) => {
              console.log("set button Error:", error);

            });

}

function startOrStop() {
	console.log("start or stop");
	cockpit.spawn(['bash', '-c', deamonPath + ' service_status'])
            .then((data) => {
                if (data.trim() === 'active') {
                    // 停止定时器并取消限速
                    cockpit.spawn(['bash','-c','systemctl stop bandwidth-limit'])
                        .then(() => {
                            updateStatus();
			                setbutton();
                        });
                } else {
                    // 启动定时器并设置限速
                    cockpit.spawn(['bash', '-c', 'systemctl start bandwidth-limit'])
                        .then(() => {
                            updateStatus();
			                setbutton();
                        });
                }
            });
}

function loadConfig() {
    cockpit.spawn(["cat", configPath])
        .then((data) => {
            let config = JSON.parse(data);
            timeSlots = config.no_limit_times || [];
	    rate = config.rate;
            displayTimeSlots();
	    console.log("config:", config);
        })
        .catch(() => {
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

function saveConfig() {
    let updatedSlots = [];

    timeSlots.forEach((_, index) => {
        let start = document.getElementById(`start_${index}`).value;
        let end = document.getElementById(`end_${index}`).value;
        if (start && end) {
            updatedSlots.push({ start, end });
        }
    });

    let config = { no_limit_times: updatedSlots, rate: rate };

    cockpit.spawn(["bash", "-c", `echo '${JSON.stringify(config, null, 4)}' > ${configPath}`])
        .then(() => {
            alert("配置已保存！");
            reloadConfig();
        })
        .catch((err) => {
            console.error("保存失败:", err);
        });
}

function reloadConfig() {
    cockpit.spawn(['bash', '-c', 'systemctl restart bandwidth-limit'])
        .then(() => {
            updateStatus();
            setbutton();
        });
}


toggleButton.addEventListener("click", startOrStop);
addTimesButton.addEventListener("click", addTimeSlot);
saveConfigButton.addEventListener("click", saveConfig);


// Send a 'init' message.  This tells integration tests that we are ready to go
cockpit.transport.wait(function() {
   updateStatus();
   setbutton()
   loadConfig();
});
