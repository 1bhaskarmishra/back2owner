const showSidebar = document.querySelector('#show-sidebar');
const sidebar = document.querySelector('.sidebar');

showSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('show-sidebar');
});

const hideSidebar = document.querySelector('#close-sidebar');
hideSidebar.addEventListener('click', () => {
    sidebar.classList.remove('show-sidebar');
});
