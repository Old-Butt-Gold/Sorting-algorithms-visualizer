const sortingContainer = document.getElementById('sorting');
const sizeSlider = document.getElementById('size_slider');
const speedSlider = document.getElementById('speed_slider');
const newArrayBtn = document.querySelector('.new');
const stopBtn = document.querySelector('.stop');

let array = [];
let isPressedStop = false;
let delay = parseInt(speedSlider.max) + 10 - parseInt(speedSlider.value);

function swap(item1, item2) {
    const tempHeight = item1.style.height;
    item1.style.height = item2.style.height;
    item2.style.height = tempHeight;
}

function createNewArray(size) {
    array = [];
    sortingContainer.innerHTML = '';
    for (let i = 0; i < size; i++) {
        const value = Math.floor(Math.random() * 1000) + 1;
        array.push(value);
        const bar = document.createElement('div');
        bar.classList.add('flex-item');
        bar.classList.add('sort-bar');
        bar.style.width = `${(1000 - size) / 100 + 1}px`;
        bar.style.height = `${value / 10}%`;
        sortingContainer.appendChild(bar);
    }
}

function delayTime(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

speedSlider.addEventListener('input', () => {
    delay = parseInt(speedSlider.max) + 10 - parseInt(speedSlider.value);
    console.log(delay);
});

sizeSlider.addEventListener('input', () => {
    createNewArray(sizeSlider.value);
});

newArrayBtn.addEventListener('click', () => {
    isPressedStop = false;
    sizeSlider.disabled = false;
    speedSlider.disabled = false;
    stopBtn.disabled = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
    createNewArray(sizeSlider.value);
});

stopBtn.addEventListener('click', () => {
    isPressedStop = true;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    stopBtn.disabled = true;
});

createNewArray(sizeSlider.value);