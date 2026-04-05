// POP UP ACCOUNT INFO
const profileBtn = document.querySelector("#user-pic");
const popupProfile = document.querySelector("#profileInfo");

profileBtn.addEventListener('click', () => {
    popupProfile.classList.toggle("visible")
});

document.addEventListener('click', e => {
    if (!popupProfile.contains(e.target) && e.target !== profileBtn) {
        popupProfile.classList.remove("visible")
    }
});