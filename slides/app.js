hljs.initHighlightingOnLoad();

const slides = document.querySelectorAll('.slide');

for (let slide of slides) {
    const actions = document.createElement('div');

    actions.classList.add('actions');
    actions.appendChild(document.createTextNode(slide.id + ':'));

    actions.appendChild(createButton(slide, 'slide'));

    actions.appendChild(createButton(slide.querySelector('code'), 'code'));

    slide.parentNode.insertBefore(actions, slide);
}

function createButton(element, contents) {
    const button = document.createElement('button');

    button.classList.add('screenshot');
    button.innerHTML = contents;

    button.addEventListener('click', () => {
        html2canvas(element).then(canvas => {
            const link = document.createElement('a');

            link.download = element.id + '.png';
            link.href = canvas.toDataURL();

            link.click();
        });
    });

    return button;
}
