const sidebar = document.getElementById('sidebar')

function toggleSidebar(){
    sidebar.classList.toggle('show')
}

function toggleOption(btn) {
    // 1. Find the parent container of the clicked button
    const container = btn.closest('.option-cont');
    
    // 2. Find the specific list inside THAT container
    const menu = container.querySelector('.option');
    
    // 3. Toggle a 'show' class (or handle display style)
    menu.classList.toggle('show');
    
    // Optional: Close other open menus
    document.querySelectorAll('.option').forEach(opt => {
        if (opt !== menu) opt.classList.remove('show');
    });
}

window.onclick = function(event) {
    if (!event.target.matches('.option-btn')) {
        const dropdowns = document.getElementsByClassName("option");
        for (let i = 0; i < dropdowns.length; i++) {
            dropdowns[i].classList.remove('show');
        }
    }
}