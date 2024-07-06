async function gnomeSort(array) {
    let pos = 0;
    let color = array[0].style.background;
    while (pos < array.length) {
        if (pos === 0 || parseFloat(array[pos].style.height) >= parseFloat(array[pos - 1].style.height)) {
            array[pos].style.background = 'green';
            pos++;
        } else {
            array[pos].style.background = 'yellow';
            array[pos - 1].style.background = 'yellow';
            await delayTime(delay);
            if (isPressedStop) return;
            swap(array[pos], array[pos - 1]);
            array[pos].style.background = 'green';
            pos--;
        }
        await delayTime(delay);
        if (isPressedStop) return;
    }
}

document.querySelector('.Gnome').addEventListener('click', async () => {
    isPressedStop = false;
    stopBtn.disabled = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await gnomeSort(document.querySelectorAll('.sort-bar'));
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
