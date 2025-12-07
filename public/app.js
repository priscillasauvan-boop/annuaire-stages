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
                    ${lieu.informations ? `<div class="infos">${escapeHtml(lieu.informations)}</div>` : ''}
                    <div class="actions">
                        <button class="btn-modifier" onclick="openModifyModal(${lieu.id})">✏️ Modifier</button>
                        ${showAdminButtons ? `<button class="btn-supprimer" onclick="deleteLieu(${lieu.id})">🗑️ Supprimer</button>` : ''}
                    </div>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function updateVillesFilter() {
    const select = document.getElementById('filterVille');
    const villes = [...new Set(allLieux.map(l => l.ville))].sort();
    
    select.innerHTML = '<option value="">Toutes les villes</option>';
    villes.forEach(ville => {
        select.innerHTML += `<option value="${escapeHtml(ville)}">${escapeHtml(ville)}</option>`;
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const filterVille = document.getElementById('filterVille');
    const filterModalite = document.getElementById('filterModalite');
    const customModalite = document.getElementById('customModalite');
    
    const doSearch = () => {
        const query = searchInput.value.toLowerCase();
        const ville = filterVille.value;
        let modalite = filterModalite.value;
        
        if (modalite === 'custom') {
            modalite = customModalite.value.trim();
        }
        
        let filtered = allLieux;
        
        if (query) {
            filtered = filtered.filter(lieu => 
                lieu.ville.toLowerCase().includes(query) ||
                lieu.nom_lieu.toLowerCase().includes(query) ||
                (lieu.informations && lieu.informations.toLowerCase().includes(query))
            );
        }
        
        if (ville) {
            filtered = filtered.filter(lieu => lieu.ville === ville);
        }
        
        if (modalite) {
            filtered = filtered.filter(lieu => 
                lieu.informations && lieu.informations.toLowerCase().includes(modalite.toLowerCase())
            );
        }
        
        displayLieux(filtered);
    };
    
    filterModalite.addEventListener('change', () => {
        if (filterModalite.value === 'custom') {
            customModalite.style.display = 'block';
            customModalite.focus();
        } else {
            customModalite.style.display = 'none';
            customModalite.value = '';
            doSearch();
        }
    });
    
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });
    filterVille.addEventListener('change', doSearch);
    customModalite.addEventListener('input', doSearch);
    customModalite.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });
}

function setupForms() {
    document.getElementById('formAjouter').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const ville = document.getElementById('ville').value.trim();
        const nomLieu = document.getElementById('nomLieu').value.trim();
        const modalites = document.getElementById('modalites').value.trim();
        const contact = document.getElementById('contact').value.trim();
        const telephone = document.getElementById('telephone').value.trim();
        const email = document.getElementById('email').value.trim();
        const tuteurs = document.getElementById('tuteurs').value.trim();
        
        let informations = '';
        if (modalites) informations += `🎯 ${modalites}\n`;
        if (contact) informations += `👔 Cadre: ${contact}\n`;
        if (telephone) informations += `📞 Tél: ${telephone}\n`;
        if (email) informations += `📧 Email: ${email}\n`;
        if (tuteurs) informations += `👨‍⚕️ Tuteurs: ${tuteurs}`;
        informations = informations.trim();
        
        try {
            const response = await fetch(`${API_BASE}/lieux`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ville, nom_lieu: nomLieu, informations })
            });
            
            if (!response.ok) throw new Error('Erreur ajout');
            
            document.getElementById('messageAjout').innerHTML = 
                '<div class="message success">✅ Lieu ajouté avec succès !</div>';
            
            e.target.reset();
            await loadLieux();
            
            setTimeout(() => {
                document.getElementById('messageAjout').innerHTML = '';
            }, 3000);
            
        } catch (error) {
            console.error('Erreur:', error);
            document.getElementById('messageAjout').innerHTML = 
                '<div class="message error">❌ Erreur lors de l\'ajout</div>';
        }
    });
    
    document.getElementById('adminLoginBtn').addEventListener('click', async () => {
        const code = document.getElementById('adminCode').value;
        
        try {
            const response = await fetch(`${API_BASE}/lieux?admin=${encodeURIComponent(code)}`);
            const data = await response.json();
            
            if (data.isAdmin) {
                isAdmin = true;
                document.getElementById('adminLogin').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'block';
                displayLieux(allLieux, true);
                loadDemandesSuppression(code);
            } else {
                document.getElementById('adminError').textContent = '❌ Code incorrect';
            }
        } catch (error) {
            document.getElementById('adminError').textContent = '❌ Erreur de connexion';
        }
    });
    
    document.getElementById('formDemandeSuppression').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lieu = document.getElementById('lieuSignale').value;
        const raison = document.getElementById('raisonSuppression').value;
        
        try {
            const response = await fetch(`${API_BASE}/demandes-suppression`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lieu_signale: lieu, raison })
            });
            
            if (!response.ok) throw new Error('Erreur envoi');
            
            document.getElementById('messageDemandeSupp').innerHTML = 
                `<div class="message success">📩 Demande envoyée !<br>
                <strong>Lieu :</strong> ${escapeHtml(lieu)}<br>
                <strong>Raison :</strong> ${escapeHtml(raison)}<br>
                <em>L'administrateur traitera votre demande.</em></div>`;
            
            e.target.reset();
        } catch (error) {
            console.error('Erreur:', error);
            document.getElementById('messageDemandeSupp').innerHTML = 
                '<div class="message error">❌ Erreur lors de l\'envoi de la demande</div>';
        }
    });
}

function setupModal() {
    const modal = document.getElementById('modalModifier');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('formModifier').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('modifierId').value;
        const ville = document.getElementById('modifierVille').value.trim();
        const nomLieu = document.getElementById('modifierNomLieu').value.trim();
        const informations = document.getElementById('modifierInfos').value.trim();
        
        try {
            const response = await fetch(`${API_BASE}/lieux/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ville, nom_lieu: nomLieu, informations })
            });
            
            if (!response.ok) throw new Error('Erreur modification');
            
            modal.style.display = 'none';
            await loadLieux();
            
            if (isAdmin) {
                displayLieux(allLieux, true);
            }
            
            alert('✅ Lieu modifié avec succès !');
            
        } catch (error) {
            console.error('Erreur:', error);
            alert('❌ Erreur lors de la modification');
        }
    });
}

function openModifyModal(id) {
    const lieu = allLieux.find(l => l.id === id);
    if (!lieu) return;
    
    document.getElementById('modifierId').value = id;
    document.getElementById('modifierVille').value = lieu.ville;
    document.getElementById('modifierNomLieu').value = lieu.nom_lieu;
    document.getElementById('modifierInfos').value = lieu.informations || '';
    
    document.getElementById('modalModifier').style.display = 'block';
}

async function deleteLieu(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce lieu ?')) return;
    
    const code = document.getElementById('adminCode').value;
    
    try {
        const response = await fetch(`${API_BASE}/lieux/${id}?admin=${encodeURIComponent(code)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erreur suppression');
        
        await loadLieux();
        displayLieux(allLieux, true);
        
        alert('✅ Lieu supprimé !');
        
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

async function loadDemandesSuppression(adminCode) {
    try {
        const response = await fetch(`${API_BASE}/demandes-suppression?admin=${encodeURIComponent(adminCode)}`);
        if (!response.ok) throw new Error('Erreur chargement demandes');
        
        const demandes = await response.json();
        displayDemandesSuppression(demandes, adminCode);
    } catch (error) {
        console.error('Erreur:', error);
        document.getElementById('listeDemandesSupp').innerHTML = 
            '<p class="error">Erreur lors du chargement des demandes</p>';
    }
}

function displayDemandesSuppression(demandes, adminCode) {
    const container = document.getElementById('listeDemandesSupp');
    
    if (demandes.length === 0) {
        container.innerHTML = '<p class="no-results">Aucune demande en attente</p>';
        return;
    }
    
    let html = '';
    demandes.forEach(demande => {
        const date = new Date(demande.created_at).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        html += `
            <div class="lieu-card" style="border-left-color: #FFC107;">
                <h3>📩 ${escapeHtml(demande.lieu_signale)}</h3>
                <p class="ville">📅 ${date}</p>
                <div class="infos">${escapeHtml(demande.raison)}</div>
                <div class="actions">
                    <button class="btn-supprimer" onclick="dismissDemande(${demande.id}, '${adminCode}')">✅ Traiter / Supprimer</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function dismissDemande(id, adminCode) {
    try {
        const response = await fetch(`${API_BASE}/demandes-suppression?id=${id}&admin=${encodeURIComponent(adminCode)}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erreur suppression');
        
        loadDemandesSuppression(adminCode);
    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la suppression de la demande');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
