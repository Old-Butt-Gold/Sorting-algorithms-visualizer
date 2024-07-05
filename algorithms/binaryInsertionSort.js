async function binaryInsertionSort(array) {
    array[0].style.background = 'green';

    for (let i = 1; i < array.length; i++) {
        let key = parseFloat(array[i].style.height);
        let j = i - 1;

        let location = await binarySearch(key, 0, j);

        for (; j >= location; j--) {
            array[j + 1].style.height = array[j].style.height;
            array[j + 1].style.background = 'yellow';
            await delayTime(delay);
            if (isPressedStop) return;

            array[j + 1].style.background = 'green';

        }

        array[j + 1].style.height = `${key}%`;
        array[i].style.background = 'green';
        await delayTime(delay);
        if (isPressedStop) return;

        for (let k = i; k >= 0; k--) {
            array[k].style.background = 'green';
        }
    }

    async function binarySearch(key, left, right) {
        while (left <= right) {
            let mid = Math.floor((left + right) / 2);
            let midValue = parseFloat(array[mid].style.height);

            array[mid].style.background = 'pink';
            await delayTime(delay);
            if (isPressedStop) return left;

            if (key < midValue) {
                right = mid - 1;
            } else {
                left = mid + 1;
            }
        }
        array[left].style.background = 'red';
        return left;
    }
}

document.querySelector('.Binary').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await binaryInsertionSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
