async function quickSort() {
    const array = document.querySelectorAll('.sort-bar');
    let color = array[0].style.background;
    await QSort(array, 0, array.length - 1);
    array.forEach(item => item.style.background = !isPressedStop ? 'lime' : color);

    async function QSort(array, left, right) {
        while (left < right) {
            let pivotIndex = await partition(array, left, right);
            if (pivotIndex === -5) return;
            if (pivotIndex - left <= right - pivotIndex) {
                await QSort(array, left, pivotIndex - 1);
                left = pivotIndex + 1;
            } else {
                await QSort(array, pivotIndex + 1, right);
                right = pivotIndex - 1;
            }
        }

        if (left >= 0 && right >= 0 && left < array.length && right < array.length){
            array[right].style.background = 'green';
            array[left].style.background = 'green';
        }

        async function partition(array, left, right) {
            let pivotIndex = left;
            let pivot = parseFloat(array[pivotIndex].style.height);
            array[pivotIndex].style.background = 'red';
            let j = left;

            await delayTime(delay);
            if (isPressedStop) return -5;

            for (let i = left + 1; i <= right; i++) {
                array[i].style.background = 'pink';
                await delayTime(delay);
                if (isPressedStop) return -5;

                if (parseFloat(array[i].style.height) <= pivot) {
                    j++;
                    swap(array[i], array[j]);
                    array[j].style.background = 'orange';
                }
            }

            await delayTime(delay);
            if (isPressedStop) return -5;

            swap(array[left], array[j]);
            array[j].style.background = 'green';
            array[left].style.background = 'pink';

            for (let k = 0; k < array.length; k++){
                if(array[k].style.background !== 'green')
                    array[k].style.background = color;
            }

            return j;
        }
    }

}

document.querySelector('.Quick').addEventListener('click', async () => {
    stopBtn.disabled = false;
    isPressedStop = false;
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = true);
    await quickSort();
    document.querySelectorAll('.Sort').forEach(btn => btn.disabled = false);
});
