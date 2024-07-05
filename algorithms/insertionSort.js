async function insertionSort(array) {
    const array = document.querySelectorAll('.sort-bar');
    array[0].style.background = 'green';
    for (let i = 1; i < array.length; i++) {
        let key = parseFloat(array[i].style.height);
        let j = i - 1;

        array[i].style.background = 'yellow';
        await delayTime(delay);
        if (isPressedStop) return;

        while (j > -1 && parseFloat(array[j].style.height) > key) {
            if (isPressedStop) return;
            array[j].style.background = 'yellow';

            await delayTime(delay);

            array[j + 1].style.height = array[j].style.height;
            array[j + 1].style.background = 'yellow';
            j--;

            for (let k = i; k > -1; k--) {
                array[k].style.background = 'green';
            }
        }

        array[j + 1].style.height = `${key}%`;
        array[i].style.background = 'green';
    }
}

document.querySelector('.Insertion').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await insertionSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
