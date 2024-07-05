async function bubbleSort() {
    const array = document.querySelectorAll('.sort-bar');
    let swapped = true;
    while (swapped) {
        swapped = false;
        let i;
        for (i = 0; i < array.length - 1; i++) {
            let color = array[i].style.background;
            array[i].style.background = 'cyan';
            array[i + 1].style.background = 'cyan';
            if (parseInt(array[i].style.height) > parseInt(array[i + 1].style.height)) {
                await delayTime(delay);
                swap(array[i], array[i + 1]);
                swapped = true;
            }
            array[i].style.background = color;
            array[i + 1].style.background = color;
        }
    }

    array.forEach(item => item.style.background = 'lime');
}

document.querySelector('.Bubble').addEventListener('click', async() => {
    isPressedStop = false;
    await bubbleSort();
    if (isPressedStop === true) {

    } else {

    }
});