/* ================= AUTH GUARD ================= */
(function requireAdminAuth() {
    if (typeof ROHIS === 'undefined') return;
    if (!ROHIS.auth.isLoggedIn()) {
        window.location.href = 'login.html';
    }
})();

function adminLogout() {
    ROHIS.auth.logout();
    window.location.href = 'login.html';
}

/* ================= SIDEBAR TOGGLE (mobile) ================= */
function toggleAdminSidebar() {
    document.getElementById('adminSidebar').classList.toggle('open');
    document.getElementById('adminOverlay').classList.toggle('show');
}
function closeAdminSidebar() {
    document.getElementById('adminSidebar').classList.remove('open');
    document.getElementById('adminOverlay').classList.remove('show');
}
