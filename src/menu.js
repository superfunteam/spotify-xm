document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.querySelector('.menu-button');
    const stationsContainer = document.querySelector('.stations');
    const nowPlayingContainer = document.querySelector('.now-playing-container');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettingsButton = document.getElementById('close-settings-menu');

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
    if (!settingsMenu) {
        console.warn('Settings menu (#settings-menu) not found.');
        return;
    }
    if (!closeSettingsButton) {
        console.warn('Close settings button (#close-settings-menu) not found.');
        return;
    }

    const elementsToShift = [stationsContainer, nowPlayingContainer];
    let isMenuOpen = false;

    function toggleMenu() {
        isMenuOpen = !isMenuOpen;

        elementsToShift.forEach(el => {
            el.classList.toggle('-translate-x-[80%]', isMenuOpen);
            el.classList.toggle('translate-x-0', !isMenuOpen);
        });

        settingsMenu.classList.toggle('translate-x-full', !isMenuOpen);
        settingsMenu.classList.toggle('translate-x-0', isMenuOpen);
    }

    menuButton.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default anchor link behavior
        toggleMenu();
    });

    closeSettingsButton.addEventListener('click', (event) => {
        event.preventDefault();
        toggleMenu(); // Same function to close the menu
    });
}); 