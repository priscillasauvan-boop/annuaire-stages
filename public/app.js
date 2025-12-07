const API_BASE = '/api';
let allLieux = [];
let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    loadLieux();
    setupTabs();
    setupSearch();
    setupForms();
    setupModal();
});

function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

async function loadLieux() {
    try {
        const response = await fetch(`${API_BASE}/lieux`);
        if (!response.ok) throw new Error('Erreur chargement');
        
        allLieux = await response.json();
        displayLieux(allLieux);
        updateVillesFilter();
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('resultats').innerHTML = 
            '<p class="error">Erreur lors du chargement de l\'annuaire</p>';
    }
}

function displayLieux(lieux, showAdminButtons = false) {
    const container = document.getElementById(showAdminButtons ? 'listeSupprimer' : 'resultats');
    
    if (lieux.length === 0) {
        container.innerHTML = '<p class="no-results">Aucun lieu trouvé</p>';
        return;
    }
    
    const groupedByVille = {};
    lieux.forEach(lieu => {
        if (!groupedByVille[lieu.ville]) {
            groupedByVille[lieu.ville] = [];
        }
        groupedByVille[lieu.ville].push(lieu);
    });
    
    let html = '';
    
    Object.keys(groupedByVille).sort().forEach(ville => {
        html += `<h3>📍 ${ville}</h3>`;
        
        groupedByVille[ville].forEach(lieu => {
            html += `
                <div class="lieu-card" data-id="${lieu.id}">
                    <h3>🏥 ${escapeHtml(lieu.nom_lieu)}</h3>
                    <p class="ville">📍 ${escapeHtml(lieu.ville)}</p>
