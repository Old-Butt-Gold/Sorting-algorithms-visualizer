async function selectionSort(array) {
    for (let i = 0; i < array.length - 1; i++) {
        let minIndex = i;
        let color = array[i].style.background;

        array[i].style.background = 'cyan';
        for (let j = i + 1; j < array.length; j++) {
            if (isPressedStop) return;

            array[j].style.background = 'cyan';

            await delayTime(delay);
            if (parseFloat(array[j].style.height) < parseFloat(array[minIndex].style.height)) {
                minIndex = j;
            }

            array[j].style.background = color;
        }

        await delayTime(delay);
        swap(array[minIndex], array[i]);
        array[i].style.background = 'green';
    }
}

document.querySelector('.Selection').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await selectionSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
