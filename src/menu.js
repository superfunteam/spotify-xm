document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.querySelector('.menu-button');
    const stationsContainer = document.querySelector('.stations');
    const nowPlayingContainer = document.querySelector('.now-playing-container');

    // Ensure all elements exist
    if (!menuButton) {
        console.warn('Menu button (.menu-button) not found.');
        return;
    }
    if (!stationsContainer) {
        console.warn('Stations container (.stations) not found.');
        return;
    }
    if (!nowPlayingContainer) {
        console.warn('Now playing container (.now-playing-container) not found.');
        return;
    }

    const elementsToShift = [stationsContainer, nowPlayingContainer];
    let isMenuOpen = false;

    menuButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default anchor link behavior
        isMenuOpen = !isMenuOpen;

        elementsToShift.forEach(el => {
            if (isMenuOpen) {
                el.classList.remove('translate-x-0');
                el.classList.add('-translate-x-[80%]');
            } else {
                el.classList.remove('-translate-x-[80%]');
                el.classList.add('translate-x-0');
            }
        });
    });
}); 