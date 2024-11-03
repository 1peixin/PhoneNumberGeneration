const provinceSelect = document.getElementById("province");
const citySelect = document.getElementById("city");
const operatorSelect = document.getElementById("operator");
const first3Input = document.getElementById("first3");
const last2Input = document.getElementById("last2");

const province = ["北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江", "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州", "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆"];

// 将省份数据添加到select中
province.forEach(prov => {
    const option = document.createElement("option");
    option.value = prov;
    option.textContent = prov;
    provinceSelect.appendChild(option);
});

let cityData = null;
// 请求city.json
function loadCityData() {
    if (cityData === null) {
        return fetch('./data/city.json')
            .then(response => response.json())
            .then(data => {
                cityData = data;
                return cityData;
            })
            .catch(error => console.error('加载城市数据时出错:', error));
    } else {
        return Promise.resolve(cityData);
    }
}

//监听provinceSelect变更
provinceSelect.addEventListener("change", function () {
    const selectedProvince = this.value;
    citySelect.innerHTML = '<option value="">请选择城市</option><option value="">未知</option>';

    loadCityData().then(data => {
        if (selectedProvince && data[selectedProvince]) {
            data[selectedProvince].forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }
    });
});

var selectedProvince = '';
var selectedCity = '';
var selectedOperator = '';
var first3 = '';
var last2 = '';

// 搜索功能
function searchPhoneNumbers() {
    selectedProvince = provinceSelect.value;
    selectedCity = citySelect.value;
    selectedOperator = operatorSelect.value;
    first3 = first3Input.value;
    last2 = last2Input.value;

    if (selectedProvince !== "" & first3 !== "" & last2 !== "") {
        var result = searchPhoneNumber(selectedProvince, selectedCity, selectedOperator);
        var itemName = `${selectedProvince || "未知"}-${selectedCity || "未知"}-${selectedOperator || "未知"}`;

        console.log(result);
        if (result.length > 0) {
            logAdd(`${itemName}：找到 ${result.length} 个匹配的号段`);

            var screenfirst3Result = screenfirst3(result, first3)
            console.log(screenfirst3Result)
            logAdd(`${itemName} 根据前3筛选：找到 ${screenfirst3Result.length} 个匹配的号段`);

            PhoneNumberGeneration(screenfirst3Result, last2)
        } else {
            logAdd(`${itemName}：未找到匹配的号段`);
        }

        return;
    }
    showSnackbar("最起码把省份 前3后2给填了吧");
}


// 从CSV文件加载号段数据
function loadPhoneData() {
    return fetch('https://px-1302018334.cos-website.ap-guangzhou.myqcloud.com/PhoneNumberGeneration/data/202302.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            const phoneData = rows.slice(1).map(row => {
                const [number, province, city, operator] = row.split(',');
                return { number, province, city, operator };
            });
            return phoneData;
        })
        .catch(error => {
            console.error('加载号段数据时出错:', error);
            return [];
        });
}

// 初始化号段数据
let phoneData = [];

// 在页面加载时获取数据
window.addEventListener('load', () => {
    loadPhoneData().then(data => {
        phoneData = data;
        console.log('号段数据加载完成');
        logAdd("号段数据加载完成");
        
        // 创建哈希表，使用 setTimeout 使其异步执行
        setTimeout(() => {
            createPhoneHashTable();
            console.log('哈希表加载完成');
            logAdd("索引哈希表加载完成");
        }, 0); // 立即执行，但在渲染后
    });
});

// 将数据转换为哈希表函数
const phoneHashTable = {};
function createPhoneHashTable() {
    phoneData.forEach(item => {
        if (!phoneHashTable[item.province]) {
            phoneHashTable[item.province] = {};
        }
        if (!phoneHashTable[item.province][item.city]) {
            phoneHashTable[item.province][item.city] = {};
        }
        if (!phoneHashTable[item.province][item.city][item.operator]) {
            phoneHashTable[item.province][item.city][item.operator] = [];
        }
        phoneHashTable[item.province][item.city][item.operator].push(item.number);
    });
}


// 创建一个索引函数
function searchPhoneNumber(province, city, operator) {
    // 确保数据已加载
    if (phoneData.length === 0) {
        console.error('号段数据尚未加载');
        return [];
    }

    let result = [];
    // 辅助函数，用于递归搜索
    function search(hashTable, province, city, operator) {
        if (province && city && operator) {
            return hashTable[province] && hashTable[province][city] && hashTable[province][city][operator] || [];
        } else if (province && city) {
            let cityResults = [];
            Object.values(hashTable[province] && hashTable[province][city] || {}).forEach(operatorList => {
                cityResults = cityResults.concat(operatorList);
            });
            return cityResults;
        } else if (province && operator) {
            let provinceResults = [];
            Object.values(hashTable[province] || {}).forEach(cityObj => {
                if (cityObj[operator]) {
                    provinceResults = provinceResults.concat(cityObj[operator]);
                }
            });
            return provinceResults;
        } else if (province) {
            let provinceResults = [];
            Object.values(hashTable[province] || {}).forEach(cityObj => {
                Object.values(cityObj).forEach(operatorList => {
                    provinceResults = provinceResults.concat(operatorList);
                });
            });
            return provinceResults;
        } else if (city && operator) {
            let cityResults = [];
            Object.values(hashTable).forEach(provinceObj => {
                if (provinceObj[city] && provinceObj[city][operator]) {
                    cityResults = cityResults.concat(provinceObj[city][operator]);
                }
            });
            return cityResults;
        } else if (city) {
            let cityResults = [];
            Object.values(hashTable).forEach(provinceObj => {
                if (provinceObj[city]) {
                    Object.values(provinceObj[city]).forEach(operatorList => {
                        cityResults = cityResults.concat(operatorList);
                    });
                }
            });
            return cityResults;
        } else if (operator) {
            let operatorResults = [];
            Object.values(hashTable).forEach(provinceObj => {
                Object.values(provinceObj).forEach(cityObj => {
                    if (cityObj[operator]) {
                        operatorResults = operatorResults.concat(cityObj[operator]);
                    }
                });
            });
            return operatorResults;
        } else {
            Object.values(hashTable).forEach(provinceObj => {
                Object.values(provinceObj).forEach(cityObj => {
                    Object.values(cityObj).forEach(operatorList => {
                        result = result.concat(operatorList);
                    });
                });
            });
            return [];
        }
    }

    // 使用辅助函数进行搜索
    if (Object.keys(phoneHashTable).length > 0) {
        result = search(phoneHashTable, province, city, operator);
        return result;
    }
}

// 消息条
function showSnackbar(message) {
    const snackbar = document.createElement("div");
    snackbar.id = "snackbar";
    snackbar.textContent = message;
    snackbar.style.opacity = "0";
    snackbar.style.transform = "scale(0.8)";
    snackbar.style.transition = "opacity 0.3s, transform 0.3s";
    document.body.appendChild(snackbar);

    // 显示动画
    setTimeout(() => {
        snackbar.style.opacity = "1";
        snackbar.style.transform = "scale(1)";
    }, 10);

    // 3秒后隐藏 Snackbar
    setTimeout(() => {
        // 隐藏动画
        snackbar.style.opacity = "0";
        snackbar.style.transform = "scale(0.8)";

        // 动画结束后移除dom
        setTimeout(() => {
            document.body.removeChild(snackbar);
        }, 300);
    }, 3000);
}

function logAdd(text) {
    const logElement = document.createElement("p");
    logElement.textContent = text;
    logElement.className = "log-text strong";
    document.getElementById("log").appendChild(logElement);
}

// 前3筛选
function screenfirst3(array, first3) {
    return array.filter(item => item.substring(0, 3) === first3);
}

// 生成文件
function PhoneNumberGeneration(array, last2) {
    var itemName = `${selectedProvince || "未知"}-${selectedCity || "未知"}-${selectedOperator || "未知"}`;
    const fileName = `${itemName} ${array[0].substring(0, 3)}------${last2}.txt`;
    let content = '';
    let count = 0;
    const totalNumbers = array.length * 100;

    const downloadFile = () => {
        const blob = new Blob([content.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const updateProgress = () => {
        const progress = Math.floor((count / totalNumbers) * 100);
        logAdd(`生成进度: ${progress}%`);
    };

    array.forEach((prefix, index) => {
        for (let i = 0; i <= 99; i++) {
            const middle = i.toString().padStart(2, '0');
            const phoneNumber = `${prefix}${middle}${last2}`;
            content += phoneNumber + '\n';
            count++;
        }

        // 每处理10个号段或处理到最后一个号段时更新进度
        if ((index + 1) % 10 === 0 || index === array.length - 1) {
            updateProgress();
        }
    });

    downloadFile();

    logAdd(`已生成并下载 ${count} 个电话号码到 ${fileName}`);
}


// 监听页面内容高度变化
function checkContentHeight() {
    const contentDiv = document.querySelector('body > div');
    const body = document.body;
    
    if (contentDiv.offsetHeight > window.innerHeight) {
        body.style.alignItems = 'flex-start';
    } else {
        body.style.alignItems = 'center';
    }
}

// 初始检查
checkContentHeight();

// 监听窗口大小变化
window.addEventListener('resize', checkContentHeight);

// 使用 MutationObserver 监听内容变化
const observer = new MutationObserver(checkContentHeight);
observer.observe(document.querySelector('body > div'), {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
});
