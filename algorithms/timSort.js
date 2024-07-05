const MIN_MERGE = 32;

async function timSort(array) {
    const len = array.length;
    const minRun = minRunLength(len);

    for (let i = 0; i < len; i += minRun) {
        if (isPressedStop) return;
        await insertionSort(array, i, Math.min(i + minRun - 1, len - 1));
    }

    for (let size = minRun; size < len; size = 2 * size) {
        for (let left = 0; left < len; left += 2 * size) {
            if (isPressedStop) return;
            let mid = left + size - 1;
            let right = Math.min((left + 2 * size - 1), (len - 1));

            if (mid < right) {
                await merge(array, left, mid, right);
            }
        }
    }

    function minRunLength(n) {
        let r = 0;
        while (n >= MIN_MERGE) {
            r |= n & 1;
            n >>= 1;
        }
        return n + r;
    }
}

async function insertionSort(array, left, right) {
    array[left].style.background = 'green';
    for (let i = left + 1; i <= right; i++) {
        let key = parseFloat(array[i].style.height);
        let j = i;

        await delayTime(delay);
        if (isPressedStop) return;

        while (j > left && parseFloat(array[j - 1].style.height) > key) {
            array[j].style.height = array[j - 1].style.height;
            array[j].style.background = 'yellow';

            await delayTime(delay);
            if (isPressedStop) return;

            array[j].style.background = 'green';
            j--;
        }

        array[j].style.height = `${key}%`;
        array[i].style.background = 'green';
    }
}

async function merge(array, left, middle, right) {
    const leftArray = [];
    const rightArray = [];

    if (isPressedStop) return;

    for (let i = left; i <= middle; i++) {
        leftArray.push(parseFloat(array[i].style.height));
        array[i].style.background = 'yellow';
        await delayTime(delay);
        if (isPressedStop) return;
    }

    for (let i = middle + 1; i <= right; i++) {
        rightArray.push(parseFloat(array[i].style.height));
        array[i].style.background = 'orange';
        await delayTime(delay);
        if (isPressedStop) return;
    }

    await delayTime(delay);
    if (isPressedStop) return;

    let i = 0, j = 0, k = left;
    while (i < leftArray.length && j < rightArray.length) {
        await delayTime(delay);
        if (isPressedStop) return;
        if (leftArray[i] <= rightArray[j]) {
            array[k].style.height = leftArray[i] + '%';
            array[k].style.background = 'lightgreen';
            i++;
        } else {
            array[k].style.height = rightArray[j] + '%';
            array[k].style.background = 'lightgreen';
            j++;
        }
        k++;
    }

    while (i < leftArray.length) {
        if (isPressedStop) return;
        array[k].style.height = leftArray[i] + '%';
        array[k].style.background = 'lightgreen';
        i++;
        k++;
    }

    while (j < rightArray.length) {
        if (isPressedStop) return;
        array[k].style.height = rightArray[j] + '%';
        array[k].style.background = 'lightgreen';
        j++;
        k++;
    }
}

document.querySelector('.Tim').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    const color = array[0].style.background;
    await timSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
