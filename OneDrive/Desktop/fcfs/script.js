// ------------- Utility Functions -------------

function parseRequests(inputStr) {
    return inputStr.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

function calculateMovementAndPath(head, requests, algo) {
    let currentHead = head;
    let path = [head];
    let movement = 0;
    let reqs = [...requests];

    if (algo === 'FCFS') {
        reqs.forEach(req => {
            movement += Math.abs(currentHead - req);
            currentHead = req;
            path.push(currentHead);
        });
    } else if (algo === 'SSTF') {
        while (reqs.length > 0) {
            let closestIdx = 0;
            let minDiff = Infinity;
            reqs.forEach((req, idx) => {
                let diff = Math.abs(currentHead - req);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestIdx = idx;
                }
            });
            let nextReq = reqs.splice(closestIdx, 1)[0];
            movement += Math.abs(currentHead - nextReq);
            currentHead = nextReq;
            path.push(currentHead);
        }
    } else if (algo === 'SCAN') {
        // Assume moving towards 199 first
        let left = reqs.filter(r => r < currentHead).sort((a, b) => b - a);
        let right = reqs.filter(r => r >= currentHead).sort((a, b) => a - b);

        right.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });
        // Go to end 199
        if (currentHead !== 199 && left.length > 0) {
            movement += Math.abs(currentHead - 199);
            currentHead = 199;
            path.push(currentHead);
        }
        left.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });

    } else if (algo === 'C-SCAN') {
        let left = reqs.filter(r => r < currentHead).sort((a, b) => a - b);
        let right = reqs.filter(r => r >= currentHead).sort((a, b) => a - b);

        right.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });

        if (left.length > 0) {
            // Jump to end 199 then 0
            if (currentHead !== 199) { movement += Math.abs(currentHead - 199); currentHead = 199; path.push(currentHead); }
            movement += Math.abs(currentHead - 0); currentHead = 0; path.push(currentHead);

            left.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });
        }
    } else if (algo === 'LOOK') {
        let left = reqs.filter(r => r < currentHead).sort((a, b) => b - a);
        let right = reqs.filter(r => r >= currentHead).sort((a, b) => a - b);

        right.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });
        left.forEach(r => { movement += Math.abs(currentHead - r); currentHead = r; path.push(currentHead); });
    }

    return { path, movement };
}

// ------------- Canvas Drawing Function -------------

async function drawGraphAnimated(canvasId, path, maxTrack = 199) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const paddingX = 30;
    const paddingY = 20;
    const usableWidth = width - (paddingX * 2);
    const usableHeight = height - (paddingY * 2);

    // Draw base track line
    ctx.beginPath();
    ctx.moveTo(paddingX, paddingY);
    ctx.lineTo(width - paddingX, paddingY);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (path.length === 0) return;

    // Helper to map track to X coordinate
    const getX = (val) => paddingX + (val / maxTrack) * usableWidth;

    const stepY = usableHeight / (path.length > 1 ? path.length - 1 : 1);

    // Initial node
    drawNode(ctx, getX(path[0]), paddingY, path[0], true);

    // Animate Path Lines and next nodes
    for (let i = 1; i < path.length; i++) {
        let startX = getX(path[i - 1]);
        let startY = paddingY + ((i - 1) * stepY);
        let endX = getX(path[i]);
        let endY = paddingY + (i * stepY);

        await animateLineAndNode(ctx, startX, startY, endX, endY, path[i]);
    }
}

function drawNode(ctx, x, y, label, isFirst = false) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = isFirst ? "#E0563F" : "#fff";
    ctx.fill();
    ctx.strokeStyle = "#412653";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#ccc";
    ctx.font = "10px sans-serif";
    ctx.fillText(label.toString(), x + 8, y + 4);
}

function animateLineAndNode(ctx, startX, startY, endX, endY, nextLabel) {
    return new Promise(resolve => {
        let progress = 0;
        const speed = 0.05; // Animation speed

        function step() {
            progress += speed;
            if (progress > 1) progress = 1;

            let currentX = startX + (endX - startX) * progress;
            let currentY = startY + (endY - startY) * progress;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.strokeStyle = "#D174D2";
            ctx.lineWidth = 2;
            ctx.stroke();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                drawNode(ctx, endX, endY, nextLabel);
                // Pause slightly between segments
                setTimeout(resolve, 300);
            }
        }
        requestAnimationFrame(step);
    });
}


// ------------- Theme Toggle -------------
const themeToggle = document.getElementById('theme-toggle');
let isDarkTechTheme = false;
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        isDarkTechTheme = !isDarkTechTheme;
        if (isDarkTechTheme) {
            document.body.setAttribute('data-theme', 'tech');
            themeToggle.innerHTML = '<span class="theme-icon">☀️</span> Theme';
        } else {
            document.body.removeAttribute('data-theme');
            themeToggle.innerHTML = '<span class="theme-icon">🌙</span> Theme';
        }
    });
}

// ------------- Lab State & Controls -------------
let currentAlgo = 'FCFS';
let simPath = [];
let simStep = 0;
let simInterval = null;
let animationSpeed = 800; // ms

const algoBtns = document.querySelectorAll('.algo-btn');
const logicTitle = document.getElementById('logic-title');
const logicDesc = document.getElementById('logic-desc');
const algoLogics = {
    'FCFS': 'Processes disk requests in the order they arrive.',
    'SSTF': 'Selects the request closest to the current head.',
    'SCAN': 'Moves like an elevator servicing requests in one direction (towards 199), then reverses.',
    'C-SCAN': 'Moves in one direction (towards 199), jumps back to 0, then continues.',
    'LOOK': 'Similar to SCAN but stops at the last request instead of the edge.'
};

const headInput = document.getElementById('lab-head');
const reqInput = document.getElementById('lab-requests');
const statCurrent = document.getElementById('stat-current');
const statTotal = document.getElementById('stat-total');
const orderDisplay = document.getElementById('lab-order-display');
const arm3d = document.getElementById('arm-3d');

// New UI Elements
const simProgressText = document.getElementById('sim-progress-text');
const stepTimeline = document.getElementById('step-timeline');
const stepTableBody = document.querySelector('#step-explanation-table tbody');
const tableTotalMovement = document.getElementById('table-total-movement');
const tableAvgSeek = document.getElementById('table-avg-seek');
const dashAvgSeek = document.getElementById('stat-avg-seek');

const stepColors = [
    '#FFA500', // Orange
    '#D174D2', // Purple (var(--accent-1))
    '#00C9FF', // Blue
    '#3FB950', // Green
    '#D29922'  // Yellow/Gold
];

// Algorithm Selection
algoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        algoBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlgo = btn.getAttribute('data-algo');
        logicTitle.textContent = currentAlgo;
        logicDesc.textContent = algoLogics[currentAlgo];
        resetSimulation();
    });
});

// Randomize Requests
const btnRandomize = document.getElementById('btn-randomize');
if (btnRandomize) {
    btnRandomize.addEventListener('click', () => {
        let count = Math.floor(Math.random() * 5) + 5;
        let randomReqs = [];
        for (let i = 0; i < count; i++) {
            randomReqs.push(Math.floor(Math.random() * 200));
        }
        reqInput.value = randomReqs.join(', ');
        headInput.value = Math.floor(Math.random() * 200);
        resetSimulation();
    });
}

// Controls
const btnPlay = document.getElementById('btn-play');
const btnPause = document.getElementById('btn-pause');
const btnNext = document.getElementById('btn-next');
const btnReset = document.getElementById('btn-reset');

function initSimulation() {
    const head = parseInt(headInput.value, 10);
    const reqs = parseRequests(reqInput.value);
    if (isNaN(head) || reqs.length === 0) return false;

    // Calculate full path
    const { path } = calculateMovementAndPath(head, reqs, currentAlgo);
    simPath = path;
    simStep = 0;

    // Reset visuals
    statCurrent.textContent = head;
    statTotal.textContent = "0";
    orderDisplay.textContent = head.toString();
    
    // Progress UI reset
    simProgressText.textContent = `Step 0 of ${reqs.length}`;

    // Update static explanation section
    updateStaticExplanation(head, reqs);

    drawGraphAnimatedLab('lab-canvas', simPath.slice(0, 1));
    update3DArm(head);
    return true;
}

function updateStaticExplanation(head, reqs) {
    stepTimeline.innerHTML = '';
    stepTableBody.innerHTML = '';
    
    let current = head;
    let totalMovement = 0;
    
    reqs.forEach((req, index) => {
        let distance = Math.abs(current - req);
        totalMovement += distance;
        let step = index + 1;

        // Add Step Timeline Card
        const stepCard = document.createElement('div');
        stepCard.className = 'step-card';
        stepCard.innerHTML = `
            <div class="step-info">
                <span class="step-number">Step ${step}</span>
                <span class="step-movement">Head moves from ${current} \u2192 ${req}</span>
            </div>
            <span class="step-distance">Distance: ${distance}</span>
        `;
        stepTimeline.appendChild(stepCard);

        // Add Step Table Row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${step}</td>
            <td>${current} \u2192 ${req}</td>
            <td>${distance}</td>
        `;
        stepTableBody.appendChild(tr);
        
        current = req;
    });

    tableTotalMovement.textContent = totalMovement;
    let avgSeek = reqs.length > 0 ? (totalMovement / reqs.length).toFixed(2) : 0;
    tableAvgSeek.textContent = avgSeek;
    dashAvgSeek.textContent = avgSeek;
}

function resetSimulation() {
    pauseSimulation();
    initSimulation();
    btnNext.disabled = false;
    btnPlay.disabled = false;
    btnPlay.style.opacity = '1';
}

function pauseSimulation() {
    if (simInterval) clearInterval(simInterval);
    simInterval = null;
    btnPlay.disabled = false;
    btnPause.disabled = true;
    btnPlay.style.opacity = '1';
    btnPause.style.opacity = '0.5';
}

function playSimulation() {
    if (simStep === 0 && simPath.length === 0) {
        if (!initSimulation()) return;
    }

    if (simStep >= simPath.length - 1) return;

    btnPlay.disabled = true;
    btnPause.disabled = false;
    btnPlay.style.opacity = '0.5';
    btnPause.style.opacity = '1';

    simInterval = setInterval(() => {
        stepSimulation();
        if (simStep >= simPath.length - 1) pauseSimulation();
    }, animationSpeed);
}

function stepSimulation() {
    if (simStep >= simPath.length - 1) return;
    simStep++;

    let partialPath = simPath.slice(0, simStep + 1);
    const totalRequests = simPath.length - 1;

    // Live update stats
    let currentHead = partialPath[simStep];
    
    statCurrent.textContent = currentHead;

    let movement = 0;
    for (let i = 1; i <= simStep; i++) {
        movement += Math.abs(partialPath[i] - partialPath[i - 1]);
    }
    statTotal.textContent = movement;

    // Progress
    simProgressText.textContent = `Step ${simStep} of ${totalRequests}`;

    // Live update history
    orderDisplay.textContent = partialPath.join(' \u2192 ');

    // Draw
    drawGraphAnimatedLab('lab-canvas', partialPath);
    update3DArm(currentHead);

    if (simStep >= simPath.length - 1) {
        btnNext.disabled = true;
        btnPlay.disabled = true;
        btnPlay.style.opacity = '0.5';
    }
}

// 3D Arm Sync
function update3DArm(track) {
    if (!arm3d) return;
    let maxTrack = 199;
    let minAngle = 30; // degrees for track 0 (outer edge)
    let maxAngle = -5; // degrees for track 199 (inner spindle)
    let angle = minAngle - (track / maxTrack) * (minAngle - maxAngle);
    arm3d.style.transform = `translateY(-50%) translateZ(15px) rotate(${angle}deg)`;
}

btnPlay.addEventListener('click', playSimulation);
btnPause.addEventListener('click', pauseSimulation);
btnNext.addEventListener('click', () => {
    pauseSimulation();
    if (simPath.length === 0) initSimulation();
    stepSimulation();
});
btnReset.addEventListener('click', resetSimulation);

headInput.addEventListener('change', resetSimulation);
reqInput.addEventListener('change', resetSimulation);

// ------------- Lab Canvas Drawing Function -------------
function drawGraphAnimatedLab(canvasId, path, maxTrack = 199) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    const paddingX = 30;
    const paddingY = 20;
    const usableWidth = width - (paddingX * 2);
    const usableHeight = height - (paddingY * 2);

    ctx.beginPath();
    ctx.moveTo(paddingX, paddingY);
    ctx.lineTo(width - paddingX, paddingY);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (path.length === 0) return;
    const getX = (val) => paddingX + (val / maxTrack) * usableWidth;
    let totalNodes = Math.max(simPath.length, 2);
    const stepY = usableHeight / (totalNodes - 1);

    drawNode(ctx, getX(path[0]), paddingY, path[0], true);

    for (let i = 1; i < path.length; i++) {
        let startX = getX(path[i - 1]);
        let startY = paddingY + ((i - 1) * stepY);
        let endX = getX(path[i]);
        let endY = paddingY + (i * stepY);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        
        // Color logic
        let color = stepColors[(i - 1) % stepColors.length];
        let alpha = (i === path.length - 1) ? 1.0 : 0.3; // Older segments are faded
        
        // Convert hex to rgba to support opacity
        const hexToRgba = (hex, opacity) => {
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        };

        ctx.strokeStyle = hexToRgba(color, alpha);
        ctx.lineWidth = (i === path.length - 1) ? 3 : 2;
        ctx.stroke();

        drawNode(ctx, endX, endY, path[i]);
    }
}

// Ensure initial render
setTimeout(() => {
    if (document.getElementById('lab-canvas')) {
        resetSimulation();
    }
}, 500);


// ------------- Comparison Simulator Setup -------------

document.getElementById('comp-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const head = parseInt(document.getElementById('comp-head').value, 10);
    const reqsStr = document.getElementById('comp-requests').value;
    const reqs = parseRequests(reqsStr);

    if (isNaN(head) || reqs.length === 0) return;

    const algos = ['FCFS', 'SSTF', 'SCAN', 'C-SCAN', 'LOOK'];
    const results = [];

    // Since comparison runs multiple concurrently, use the animated draw graph but immediately populate tables
    algos.forEach(algo => {
        const res = calculateMovementAndPath(head, reqs, algo);
        results.push({ algo, path: res.path, movement: res.movement });

        const algoId = algo.toLowerCase().replace('-', '');
        drawGraphAnimated(`comp-${algoId}-canvas`, res.path);
        document.getElementById(`comp-${algoId}-order`).textContent = res.path.join(' \u2192 ');
    });

    // Unhide Results
    document.getElementById('comp-results').classList.remove('hidden');

    // Comparison Table Update
    const tbody = document.querySelector('#comparison-table tbody');
    tbody.innerHTML = '';

    let minMove = Math.min(...results.map(r => r.movement));

    results.forEach(res => {
        const tr = document.createElement('tr');
        if (res.movement === minMove) tr.classList.add('best-algo');

        const tdAlgo = document.createElement('td');
        tdAlgo.textContent = res.algo;
        if (res.movement === minMove) tdAlgo.textContent += ' (Best)';

        const tdMove = document.createElement('td');
        tdMove.textContent = res.movement;

        tr.appendChild(tdAlgo);
        tr.appendChild(tdMove);
        tbody.appendChild(tr);
    });

    // Smooth scroll
    document.getElementById('comp-results').scrollIntoView({ behavior: 'smooth' });
});

// ------------- FCFS CPU Simulator Setup -------------
let processCount = 4;

const addBtn = document.getElementById('add-process-btn');
const rmBtn = document.getElementById('remove-process-btn');
const cpuRunBtn = document.getElementById('run-cpu-sim-btn');
const tbodyCpu = document.querySelector('#process-table tbody');

if (addBtn) {
    addBtn.addEventListener('click', () => {
        processCount++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P${processCount}</td>
            <td><input type="number" class="process-arrival cpu-input" value="${Math.floor(Math.random() * 10)}" min="0"></td>
            <td><input type="number" class="process-burst cpu-input" value="${Math.floor(Math.random() * 10) + 1}" min="1"></td>
        `;
        tbodyCpu.appendChild(row);
    });
}

if (rmBtn) {
    rmBtn.addEventListener('click', () => {
        if (processCount > 1) {
            tbodyCpu.removeChild(tbodyCpu.lastElementChild);
            processCount--;
        }
    });
}

if (cpuRunBtn) {
    cpuRunBtn.addEventListener('click', () => {
        const rows = document.querySelectorAll('#process-table tbody tr');
        let processes = [];

        rows.forEach((row, index) => {
            const id = `P${index + 1}`;
            const arrival = parseInt(row.querySelector('.process-arrival').value) || 0;
            const burst = parseInt(row.querySelector('.process-burst').value) || 1;
            processes.push({ id, arrival, burst, start: 0, completion: 0, waiting: 0, turnaround: 0, response: 0 });
        });

        processes.sort((a, b) => a.arrival - b.arrival);

        let currentTime = 0;
        let totalBurst = 0;
        let totalWait = 0;
        let totalTurn = 0;
        let totalResp = 0;
        let ganttBlocks = [];

        processes.forEach(p => {
            if (currentTime < p.arrival) {
                ganttBlocks.push({ type: 'idle', start: currentTime, end: p.arrival, duration: p.arrival - currentTime });
                currentTime = p.arrival;
            }
            p.start = currentTime;
            p.completion = currentTime + p.burst;
            p.turnaround = p.completion - p.arrival;
            p.waiting = p.turnaround - p.burst;
            p.response = p.start - p.arrival;

            ganttBlocks.push({ type: 'process', id: p.id, start: p.start, end: p.completion, duration: p.burst });

            currentTime = p.completion;
            totalBurst += p.burst;
            totalWait += p.waiting;
            totalTurn += p.turnaround;
            totalResp += p.response;
        });

        const n = processes.length;
        const avgWait = (totalWait / n).toFixed(2);
        const avgTurn = (totalTurn / n).toFixed(2);
        const avgResp = (totalResp / n).toFixed(2);
        const firstArrival = processes[0].arrival;
        const finalCompletion = currentTime;
        const makespan = finalCompletion - firstArrival;
        const cpuUtil = makespan > 0 ? ((totalBurst / makespan) * 100).toFixed(2) : 100;
        const throughput = makespan > 0 ? (n / makespan).toFixed(3) : n;

        // Results table
        const resTbody = document.querySelector('#cpu-calc-table tbody');
        resTbody.innerHTML = '';
        const outProcesses = [...processes].sort((a, b) => parseInt(a.id.substring(1)) - parseInt(b.id.substring(1)));

        outProcesses.forEach(p => {
            resTbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.arrival}</td>
                    <td>${p.burst}</td>
                    <td>${p.start}</td>
                    <td>${p.completion}</td>
                    <td>${p.waiting}</td>
                    <td>${p.turnaround}</td>
                    <td>${p.response}</td>
                </tr>
            `;
        });

        // Show panel
        const resultsPanel = document.getElementById('cpu-results-panel');
        resultsPanel.classList.remove('hidden');

        document.getElementById('dash-cpu-util').innerText = `${cpuUtil}%`;
        document.getElementById('dash-throughput').innerText = throughput;
        document.getElementById('dash-avg-wait').innerText = avgWait;
        document.getElementById('dash-avg-turn').innerText = avgTurn;
        document.getElementById('dash-avg-resp').innerText = avgResp;

        renderGanttChart(ganttBlocks, finalCompletion);
        renderCPUCharts(outProcesses, avgWait, avgTurn, avgResp);

        resultsPanel.scrollIntoView({ behavior: 'smooth' });
    });
}

function renderGanttChart(blocks, totalTime) {
    const container = document.getElementById('gantt-chart-container');
    const axis = document.getElementById('gantt-time-axis');
    container.innerHTML = '';
    axis.innerHTML = '';

    if (totalTime === 0) return;

    const colors = ['#D174D2', '#E0563F', '#58a6ff', '#3fb950', '#d29922', '#f85149'];

    blocks.forEach((bg, index) => {
        const widthPercent = (bg.duration / totalTime) * 100;
        const blockEl = document.createElement('div');
        blockEl.className = bg.type === 'idle' ? 'gantt-block gantt-idle' : 'gantt-block';
        blockEl.style.width = '0%';

        if (bg.type === 'process') {
            const colorIdx = parseInt(bg.id.substring(1)) % colors.length;
            blockEl.style.backgroundColor = colors[colorIdx];
            blockEl.innerText = bg.id;
        }

        container.appendChild(blockEl);

        setTimeout(() => {
            blockEl.style.width = `${widthPercent}%`;
        }, 100);

        if (index === 0) {
            addGanttTick(axis, bg.start, 0);
        }

        const endPercent = (bg.end / totalTime) * 100;
        addGanttTick(axis, bg.end, endPercent);
    });
}

function addGanttTick(axisContainer, time, leftPercent) {
    const tick = document.createElement('div');
    tick.className = 'gantt-tick';
    tick.style.left = `${leftPercent}%`;
    tick.innerText = time;
    axisContainer.appendChild(tick);
}

function renderCPUCharts(processes, avgWait, avgTurn, avgResp) {
    const canvas = document.getElementById('bar-chart-perf');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Set internal resolution same as display size for sharpness
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 50;
    const paddingRight = 30;
    const paddingTop = 40;
    const paddingBottom = 60;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Get max value for scaling
    const allData = processes.flatMap(p => [p.waiting, p.turnaround, p.response]);
    const maxVal = Math.max(...allData, 1); // Avoid division by zero

    const barGroupWidth = chartWidth / processes.length;
    const barWidth = (barGroupWidth * 0.7) / 3;
    const groupGap = barGroupWidth * 0.15;

    const colors = [
        'rgba(210, 153, 34, 0.8)',  // Waiting
        'rgba(209, 116, 210, 0.8)', // Turnaround
        'rgba(224, 86, 63, 0.8)'    // Response
    ];

    const labels = ['Waiting Time', 'Turnaround Time', 'Response Time'];

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = paddingTop + (chartHeight * (1 - i / 5));
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();
        
        ctx.fillStyle = '#aaa';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(maxVal * (i / 5)).toString(), paddingLeft - 10, y + 4);
    }

    // Draw Bars
    processes.forEach((p, i) => {
        const xStart = paddingLeft + (i * barGroupWidth) + groupGap;
        
        const dataValues = [p.waiting, p.turnaround, p.response];
        
        dataValues.forEach((val, j) => {
            const barHeight = (val / maxVal) * chartHeight;
            const x = xStart + (j * barWidth);
            const y = paddingTop + chartHeight - barHeight;

            ctx.fillStyle = colors[j];
            ctx.fillRect(x, y, barWidth - 2, barHeight);
        });

        // X-axis label (Process ID)
        ctx.fillStyle = '#fff';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.id, xStart + (barWidth * 1.5), paddingTop + chartHeight + 20);
    });

    // Draw Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + chartHeight);
    ctx.lineTo(width - paddingRight, paddingTop + chartHeight);
    ctx.stroke();

    // Draw Legend
    const legendX = paddingLeft;
    const legendY = paddingTop + chartHeight + 45;
    const legendSpacing = 120;

    labels.forEach((label, i) => {
        const x = legendX + (i * legendSpacing);
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, legendY, 12, 12);
        
        ctx.fillStyle = '#fff';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 18, legendY + 11);
    });
}
