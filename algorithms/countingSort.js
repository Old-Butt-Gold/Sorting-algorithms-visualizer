async function countingSort(array) {
    let heights = Array.from(array, bar => parseFloat(bar.style.height) * 10);
    let max = Math.max(...heights);
    let min = Math.min(...heights);

    let range = max - min + 1;
    let count = new Array(range).fill(0);

    for (let i = 0; i < heights.length; i++) {
        array[i].style.background = 'cyan';
        count[heights[i] - min]++;
        await delayTime(delay);
        if (isPressedStop) return;
    }

    let index = 0;
    for (let i = 0; i < count.length; i++) {
        while (count[i]-- > 0) {
            array[index].style.height = `${(i + min) / 10}%`;
            array[index].style.background = 'green';
            await delayTime(delay);
            if (isPressedStop) return;
            index++;
        }
    }
}

document.querySelector('.Counting').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await countingSort(array);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
