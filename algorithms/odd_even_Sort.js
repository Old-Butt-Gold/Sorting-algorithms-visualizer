async function oddEvenSort(array) {
    let sorted = false;
    let color = array[0].style.background;
    while (!sorted) {
        sorted = true;

        for (let i = 1; i < array.length - 1; i += 2) {
            if (parseFloat(array[i].style.height) > parseFloat(array[i + 1].style.height)) {
                array[i].style.background = 'cyan';
                array[i + 1].style.background = 'cyan';
                await delayTime(delay);
                if (isPressedStop) return;
                swap(array[i], array[i + 1]);

                array[i].style.background = color;
                array[i + 1].style.background = color;

                sorted = false;
            }
        }

        for (let i = 0; i < array.length - 1; i += 2) {
            if (parseFloat(array[i].style.height) > parseFloat(array[i + 1].style.height)) {
                array[i].style.background = 'cyan';
                array[i + 1].style.background = 'cyan';
                await delayTime(delay);
                if (isPressedStop) return;
                swap(array[i], array[i + 1]);

                array[i].style.background = color;
                array[i + 1].style.background = color;

                sorted = false;
            }
        }
    }
}

document.querySelector('.Odd-Even').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    const color = array[0].style.background;
    await oddEvenSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
