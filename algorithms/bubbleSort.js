async function bubbleSort() {
    const array = document.querySelectorAll('.sort-bar');
    let swapped;
    let counter = 0;
    do {
        swapped = false;
        for (let i = 0; i < array.length - 1 - counter; i++) {
            if (isPressedStop) return;

            let color = array[i].style.background;
            array[i].style.background = 'cyan';
            array[i + 1].style.background = 'cyan';

            if (parseFloat(array[i].style.height) > parseFloat(array[i + 1].style.height)) {
                await delayTime(delay);
                swap(array[i], array[i + 1]);
                swapped = true;
            }

            array[i].style.background = color;
            array[i + 1].style.background = color;
        }

        array[array.length - 1 - counter].style.background = 'green';
        counter++;

    } while (swapped);
    array.forEach(item => item.style.background = 'lime');
}

document.querySelector('.Bubble').addEventListener('click', async () => {
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    await bubbleSort();
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
