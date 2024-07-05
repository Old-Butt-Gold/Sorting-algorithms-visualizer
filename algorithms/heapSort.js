async function heapSort(array) {
    const len = array.length;
    const color = array[0].style.background;

    for (let i = Math.floor(len / 2) - 1; i >= 0; i--) {
        if (isPressedStop) return;
        await heapify(array, len, i);
    }

    for (let i = len - 1; i > 0; i--) {
        swap(array[0], array[i]);
        array[i].style.background = 'green';
        await delayTime(delay);
        if (isPressedStop) return;

        await heapify(array, i, 0);
    }

    async function heapify(array, length, i) {
        let largest = i;
        let left = 2 * i + 1;
        let right = 2 * i + 2;

        if (left < length && parseFloat(array[left].style.height) > parseFloat(array[largest].style.height)) {
            largest = left;
        }

        if (right < length && parseFloat(array[right].style.height) > parseFloat(array[largest].style.height)) {
            largest = right;
        }

        if (largest !== i) {
            array[largest].style.background = 'cyan';
            array[i].style.background = 'cyan';
            await delayTime(delay);
            if (isPressedStop) return;
            swap(array[i], array[largest]);
            array[largest].style.background = color;
            array[i].style.background = color;

            await heapify(array, length, largest);
        }
    }

}

document.querySelector('.Heap').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    await heapSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : item.style.background);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
