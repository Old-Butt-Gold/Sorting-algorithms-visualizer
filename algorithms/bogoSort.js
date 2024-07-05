async function isSorted(array) {
    const color = array[0].style.background;
    array[0].style.background = 'green';
    for (let i = 1; i < array.length; i++) {
        await delayTime(delay);
        if (isPressedStop) return;
        if (parseFloat(array[i].style.height) < parseFloat(array[i - 1].style.height)) {
            for (let k = 0; k <= i; k++) {
                array[k].style.background = color;
            }
            return false;
        }
        array[i].style.background = 'green';
    }
    return true;
}

async function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let color = array[j].style.background;
        array[i].style.background = 'yellow';
        array[j].style.background = 'yellow';
        swap(array[i], array[j]);
        await delayTime(delay);
        if (isPressedStop) return;
        array[i].style.background = color;
        array[j].style.background = color;
    }
}

async function bogoSort(array) {
    while (!await isSorted(array)) {
        await shuffle(array);
        if (isPressedStop) return;
    }
}

document.querySelector('.Bogo').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await bogoSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});