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

async function mergeSortHelper(array, left, right) {
    if (left >= right) return;
    const middle = Math.floor((left + right) / 2);
    await mergeSortHelper(array, left, middle);
    await mergeSortHelper(array, middle + 1, right);

    await merge(array, left, middle, right);
}

async function mergeSort() {
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await mergeSortHelper(array, 0, array.length - 1);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
}

document.querySelector('.Merge').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    await mergeSort();
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
