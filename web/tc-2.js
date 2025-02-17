const configPath = "/root/bandwidth/bandwidth_scheduler.json";  // JSON 配置路径
const addTimesButton = document.getElementById('addTimes');
const saveConfigButton = document.getElementById('saveConfig');

let timeSlots = [];
let rate = "";

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
        })
        .catch((err) => {
            console.error("保存失败:", err);
        });
}

function reloadConfig() {

}

addTimesButton.addEventListener("click", addTimeSlot);
saveConfigButton.addEventListener("click", saveConfig);


cockpit.transport.wait(function() {
   loadConfig();
});

