async function shakerSort(array) {
    let left = 0;
    let right = array.length - 1;
    let swapped = true;
    let color = array[0].style.background;
    while (swapped) {
        swapped = false;
        for (let i = left; i < right; i++) {
            if (parseFloat(array[i].style.height) > parseFloat(array[i + 1].style.height)) {

                array[i].style.background = 'cyan';
                array[i + 1].style.background = 'cyan';
                await delayTime(delay);
                if (isPressedStop) return;
                swap(array[i], array[i + 1]);
                array[i].style.background = color;
                array[i + 1].style.background = color;

                swapped = true;
            }
        }
        array[right].style.background = 'green';
        right--;
        if (!swapped) break;

        swapped = false;
        for (let i = right; i > left; i--) {
            if (parseFloat(array[i].style.height) < parseFloat(array[i - 1].style.height)) {
                array[i].style.background = 'cyan';
                array[i - 1].style.background = 'cyan';
                await delayTime(delay);
                if (isPressedStop) return;
                swap(array[i], array[i - 1]);
                array[i].style.background = color;
                array[i - 1].style.background = color;
                swapped = true;
            }
        }
        array[left].style.background = 'green';
        left++;
    }
}

document.querySelector('.Shaker').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    const color = array[0].style.background;
    await shakerSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
