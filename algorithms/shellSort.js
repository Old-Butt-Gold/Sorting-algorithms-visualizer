async function shellSort(array) {
    let gap = array.length / 2;
    let color = array[0].style.background;
    while (gap >= 1) {
        for (let i = gap; i < array.length; i++) {
            let key = parseFloat(array[i].style.height);
            let j = i - gap;

            await delayTime(delay);
            if (isPressedStop) return;

            while (j >= 0 && parseFloat(array[j].style.height) > key) {
                array[j + gap].style.height = array[j].style.height;
                array[j + gap].style.background = 'cyan';
                array[j].style.background = 'pink';

                await delayTime(delay);
                if (isPressedStop) return;

                array[j + gap].style.background = 'pink';
                array[j].style.background = 'cyan';
                j -= gap;
            }

            array[j + gap].style.height = `${key}%`;
        }

        array.forEach(item => item.style.background = color);

        gap = Math.floor(gap / 2);
    }
}

document.querySelector('.Shell').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await shellSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
