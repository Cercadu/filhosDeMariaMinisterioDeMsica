// app.js - Funcionalidades principais do aplicativo

// Variáveis globais
let isOnline = navigator.onLine;
let allSongs = [];
let personalSongs = [];
let publicPlaylists = [];
let personalPlaylists = [];
let currentPlaylist = null;
let activeSong = null;
let activeCategory = 'all';
let originalSongContent = '';
let currentSongTransposition = 0;
let editingSongId = null;
let editingPlaylistId = null;

// Variáveis globais
let songs = [];

// Inicializar aplicativo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar autenticação
    AuthJS.initAuth();

    // Verificar conectividade
    checkOnlineStatus();

    // Carregar dados (será chamado após a autenticação)

    // Configurar eventos
    setupEventListeners();

    // Verificar alterações na conectividade
    window.addEventListener('online', () => {
        isOnline = true;
        checkOnlineStatus();
        syncData();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        checkOnlineStatus();
        showOfflineToast();
    });
});

// Verificar status online/offline
function checkOnlineStatus() {
    const indicator = document.getElementById('onlineStatusIndicator');
    const statusText = document.getElementById('syncStatusText');

    if (isOnline) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
        statusText.textContent = 'Conectado';
    } else {
        indicator.classList.remove('online');
        indicator.classList.add('offline');
        statusText.textContent = 'Modo Offline';
        showOfflineToast();
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Menu e navegação
    document.getElementById('showAllSongs').addEventListener('click', () => {
        showAllSongs();
    });

    document.getElementById('btnFavoritos').addEventListener('click', () => {
        showFavorites();
    });

    document.getElementById('btnAddSong').addEventListener('click', () => {
        showAddSongModal();
    });

    document.getElementById('btnUserAccount').addEventListener('click', () => {
        showAccountModal();
    });

    document.getElementById('btnCreatePlaylist').addEventListener('click', () => {
        showCreatePlaylistModal();
    });

    // Rolagem automática
    document.getElementById('autoscrollSwitch').addEventListener('change', e => {
        const contentEl = document.getElementById('songDetailContent');
        if (e.target.checked) {
            CifrasJS.startAutoScroll(contentEl);
        } else {
            CifrasJS.stopAutoScroll();
        }
    });

    document.getElementById('scrollSpeed').addEventListener('input', e => {
        scrollSpeed = parseInt(e.target.value);
        document.getElementById('scrollSpeedValue').textContent = scrollSpeed;

        // Reiniciar a rolagem se estiver ativa
        if (document.getElementById('autoscrollSwitch').checked) {
            const contentEl = document.getElementById('songDetailContent');
            CifrasJS.stopAutoScroll();
            CifrasJS.startAutoScroll(contentEl);
        }
    });

    // Transposição de acordes
    document.getElementById('btnTransposeUp').addEventListener('click', () => {
        transposeActiveSong(1);
    });

    document.getElementById('btnTransposeDown').addEventListener('click', () => {
        transposeActiveSong(-1);
    });

    document.getElementById('btnOriginalKey').addEventListener('click', () => {
        resetTransposition();
    });

    // Pesquisa
    document.getElementById('searchInput').addEventListener('input', () => {
        filterSongs();
    });

    // Autenticação
    document.getElementById('btnLogin').addEventListener('click', () => {
        loginUser();
    });

    document.getElementById('btnLoginWithGoogle').addEventListener('click', () => {
        loginWithGoogle();
    });

    document.getElementById('btnRegister').addEventListener('click', () => {
        registerUser();
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        logoutUser();
    });

    document.getElementById('btnShowRegister').addEventListener('click', () => {
        toggleAuthForms('register');
    });

    document.getElementById('btnShowLogin').addEventListener('click', () => {
        toggleAuthForms('login');
    });

    // Salvar música
    document.getElementById('btnSaveNewSong').addEventListener('click', () => {
        saveSong();
    });

    // Importar cifra
    document.getElementById('btnImportCifra').addEventListener('click', () => {
        importCifraFromUrl();
    });

    // Salvar playlist
    document.getElementById('btnSavePlaylist').addEventListener('click', () => {
        savePlaylist();
    });

    // Admin: exportar músicas
    document.getElementById('btnExportSongs').addEventListener('click', () => {
        showExportSongsModal();
    });

    document.getElementById('btnCopyJson').addEventListener('click', () => {
        copyExportedJson();
    });

    document.getElementById('btnDownloadJson').addEventListener('click', () => {
        downloadExportedJson();
    });

    // Importação JSON
    document.getElementById('btnShowImportJson').addEventListener('click', () => {
        showImportJsonModal();
    });

    document.getElementById('btnImportJson').addEventListener('click', () => {
        importSongsFromJson();
    });

    // Fechar modais ao clicar no botão Salvar/Fechar
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('hidden.bs.modal', () => {
            CifrasJS.stopAutoScroll();
        });
    });

    // Mudança de filtro
    document.getElementById('categoryDropdown').addEventListener('click', e => {
        if (e.target.hasAttribute('data-category')) {
            e.preventDefault();
            selectCategory(e.target.getAttribute('data-category'));
        }
    });
}

// Filtrar músicas
function filterSongs() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const songsContainer = document.getElementById('songsList');
    songsContainer.innerHTML = '';

    // Determinar quais músicas exibir com base no contexto atual
    let songsToFilter = [];

    if (currentPlaylist) {
        // Mostrar músicas da playlist atual
        songsToFilter = currentPlaylist.songs.map(songId => {
            return allSongs.find(s => s.id === songId) ||
                personalSongs.find(s => s.id === songId);
        }).filter(s => s); // Remover undefined/null
    } else {
        // Combinar músicas do Firebase e locais
        songsToFilter = [...allSongs, ...personalSongs];
    }

    // Aplicar filtros
    const filteredSongs = songsToFilter.filter(song => {
        // Filtro de categoria
        const categoryMatch = activeCategory === 'all' ||
            (song.category && song.category.toLowerCase().includes(activeCategory.toLowerCase()));

        // Filtro de pesquisa
        const searchMatch = !searchText ||
            song.title.toLowerCase().includes(searchText) ||
            (song.content && song.content.toLowerCase().includes(searchText)) ||
            (song.category && song.category.toLowerCase().includes(searchText));

        return categoryMatch && searchMatch;
    });

    // Renderizar as músicas filtradas
    renderSongs(filteredSongs);
}

// Renderizar lista de músicas
function renderSongs(songs) {
    const songsContainer = document.getElementById('songsList');
    songsContainer.innerHTML = '';

    if (songs.length === 0) {
        songsContainer.innerHTML = `
            <div class="col-12 text-center my-5">
                <div class="alert alert-light">
                    <i class="fas fa-search fa-2x mb-3"></i>
                    <h4>Nenhuma música encontrada</h4>
                    <p class="mb-0">Tente ajustar os filtros ou adicione uma nova cifra.</p>
                </div>
            </div>
        `;
        return;
    }

    // Ordenar alfabeticamente
    songs.sort((a, b) => a.title.localeCompare(b.title));

    songs.forEach(song => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-lg-3 mb-4 fade-in-up';

        // Verificar se é favorito
        const isFavorite = song.isFavorite || false;

        // Verificar se tem tom definido
        const songKey = song.key || '';
        const songCapo = song.capo || 0;
        const keyDisplay = songKey ?
            (songCapo > 0 ? `${songKey} (Capo: ${songCapo})` : songKey) : '';

        col.innerHTML = `
            <div class="card song-card h-100">
                <div class="card-body">
                    <h5 class="card-title">${song.title}</h5>
                    <p class="card-category">${song.category || 'Sem categoria'}</p>
                    ${keyDisplay ? `<p class="card-key"><i class="fas fa-music"></i> ${keyDisplay}</p>` : ''}
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" data-song-id="${song.id}">
                        <i class="fas fa-star"></i>
                    </button>
                </div>
                <div class="card-footer">
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-sm btn-primary open-song" data-song-id="${song.id}">
                            <i class="fas fa-eye"></i> Ver
                        </button>
                        <div>
                            ${song.userId === AuthJS.getCurrentUserId() ? `
                                <button class="btn-edit" data-song-id="${song.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-delete" data-song-id="${song.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        songsContainer.appendChild(col);

        // Adicionar event listeners
        const openBtn = col.querySelector('.open-song');
        openBtn.addEventListener('click', () => {
            openSongDetail(song.id);
        });

        // Também abrir ao clicar no card inteiro
        const card = col.querySelector('.card');
        card.addEventListener('click', e => {
            // Verificar se o clique foi em um botão
            if (!e.target.closest('button')) {
                openSongDetail(song.id);
            }
        });

        // Favoritar
        const favBtn = col.querySelector('.btn-favorite');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(song.id);
        });

        // Editar e excluir
        const editBtn = col.querySelector('.btn-edit');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                editSong(song.id);
            });
        }

        const deleteBtn = col.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDeleteSong(song.id);
            });
        }
    });
}

// Atualizar as categorias no menu dropdown
function updateCategories() {
    const dropdown = document.getElementById('categoryDropdown');
    const allSongsItem = dropdown.querySelector('[data-category="all"]');

    // Limpar itens existentes, mantendo o "Todas as categorias"
    const existingItems = dropdown.querySelectorAll('li:not(:first-child)');
    existingItems.forEach(item => item.remove());

    // Coletar todas as categorias únicas
    const categories = new Set();

    // Adicionar categorias das músicas do Firebase
    allSongs.forEach(song => {
        if (song.category) {
            // Se tiver formato "Celebração > Momento", extrair as partes
            if (song.category.includes('>')) {
                const parts = song.category.split('>').map(p => p.trim());

                // Adicionar categoria principal
                categories.add(parts[0]);

                // Adicionar subcategoria com formato "Principal > Sub"
                categories.add(song.category);
            } else {
                categories.add(song.category);
            }
        }
    });

    // Adicionar categorias das músicas locais
    personalSongs.forEach(song => {
        if (song.category) {
            if (song.category.includes('>')) {
                const parts = song.category.split('>').map(p => p.trim());
                categories.add(parts[0]);
                categories.add(song.category);
            } else {
                categories.add(song.category);
            }
        }
    });

    // Ordenar categorias
    const sortedCategories = Array.from(categories).sort();

    // Adicionar ao dropdown
    sortedCategories.forEach(category => {
        const li = document.createElement('li');

        // Adicionar margem para subcategorias
        const isSubcategory = category.includes('>');
        const indent = isSubcategory ? 'ms-3' : '';

        li.innerHTML = `<a class="dropdown-item ${indent}" href="#" data-category="${category}">${category}</a>`;
        dropdown.appendChild(li);

        // Adicionar evento de clique
        li.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            selectCategory(category);
        });
    });
}

// Selecionar categoria
function selectCategory(category) {
    activeCategory = category;

    // Atualizar UI
    const dropdown = document.getElementById('categoryDropdown');
    const items = dropdown.querySelectorAll('.dropdown-item');
    items.forEach(item => {
        if (item.getAttribute('data-category') === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Filtrar músicas
    filterSongs();
}

// Abrir detalhe da música
function openSongDetail(songId) {
    // Encontrar a música
    const song = allSongs.find(s => s.id === songId) || personalSongs.find(s => s.id === songId);
    if (!song) return;

    // Resetar transposição
    currentSongTransposition = 0;

    // Salvar música atual
    activeSong = song;
    originalSongContent = song.content;

    // Preencher o modal
    const modal = document.getElementById('songDetailModal');
    const title = document.getElementById('songDetailTitle');
    const info = document.getElementById('songDetailInfo');
    const content = document.getElementById('songDetailContent');

    title.textContent = song.title;

    // Informações sobre tom e capo
    const keyInfo = song.key ? `Tom: ${song.key}` : '';
    const capoInfo = song.capo && song.capo > 0 ? `Capotraste: ${song.capo}ª casa` : '';
    info.textContent = [keyInfo, capoInfo].filter(Boolean).join(' | ');

    // Formatar conteúdo
    content.innerHTML = CifrasJS.formatSongContent(song.content);

    // Desabilitar rolagem automática
    document.getElementById('autoscrollSwitch').checked = false;

    // Mostrar o modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    // Atualizar dropdown de playlists
    updateAddToPlaylistDropdown(songId);
}

// Atualizar dropdown para adicionar música a uma playlist
function updateAddToPlaylistDropdown(songId) {
    const dropdown = document.getElementById('addToPlaylistDropdown');
    dropdown.innerHTML = '';

    if (personalPlaylists.length === 0) {
        const li = document.createElement('li');
        li.innerHTML = `<a class="dropdown-item disabled" href="#">Nenhuma lista disponível</a>`;
        dropdown.appendChild(li);
        return;
    }

    personalPlaylists.forEach(playlist => {
        const li = document.createElement('li');

        // Verificar se a música já está na playlist
        const isInPlaylist = playlist.songs && playlist.songs.includes(songId);

        li.innerHTML = `
            <a class="dropdown-item ${isInPlaylist ? 'disabled' : ''}" href="#" data-playlist-id="${playlist.id}">
                ${playlist.name}
                ${isInPlaylist ? '<i class="fas fa-check ms-2 text-success"></i>' : ''}
            </a>
        `;

        if (!isInPlaylist) {
            li.querySelector('a').addEventListener('click', (e) => {
                e.preventDefault();
                addSongToPlaylist(songId, playlist.id);
            });
        }

        dropdown.appendChild(li);
    });

    // Adicionar opção para criar nova playlist
    const liNew = document.createElement('li');
    liNew.innerHTML = `<hr class="dropdown-divider">`;
    dropdown.appendChild(liNew);

    const liCreate = document.createElement('li');
    liCreate.innerHTML = `
        <a class="dropdown-item" href="#" id="btnCreatePlaylistWithSong">
            <i class="fas fa-plus"></i> Nova Lista
        </a>
    `;

    liCreate.querySelector('a').addEventListener('click', (e) => {
        e.preventDefault();
        showCreatePlaylistModal(songId);
    });

    dropdown.appendChild(liCreate);
}

// Adicionar música a uma playlist
function addSongToPlaylist(songId, playlistId) {
    // Encontrar a playlist
    const playlist = personalPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Verificar se a música já está na playlist
    if (playlist.songs && playlist.songs.includes(songId)) {
        return;
    }

    // Adicionar música
    if (!playlist.songs) {
        playlist.songs = [];
    }

    playlist.songs.push(songId);

    // Salvar no Firebase se estiver online
    if (isOnline && AuthJS.isUserAuthenticated()) {
        db.collection('playlists').doc(playlistId).update({
            songs: playlist.songs
        })
            .then(() => {
                showSuccessToast(`Música adicionada à lista "${playlist.name}"`);
                updateAddToPlaylistDropdown(songId);
            })
            .catch(error => {
                console.error('Erro ao adicionar música à playlist:', error);
                showErrorToast('Erro ao adicionar música à lista');
            });
    } else {
        // Salvar localmente
        localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));
        showSuccessToast(`Música adicionada à lista "${playlist.name}"`);
        updateAddToPlaylistDropdown(songId);
    }
}

// Transposição de acordes
function transposeActiveSong(semitones) {
    if (!activeSong || !originalSongContent) return;

    // Atualizar contador de transposição
    currentSongTransposition += semitones;

    // Transpor conteúdo
    const transposedContent = CifrasJS.transposeContent(originalSongContent, currentSongTransposition);

    // Atualizar na interface
    const content = document.getElementById('songDetailContent');
    content.innerHTML = CifrasJS.formatSongContent(transposedContent);

    // Atualizar informação de tom
    updateTranspositionInfo();
}

// Resetar transposição
function resetTransposition() {
    if (!activeSong || !originalSongContent) return;

    // Resetar contador
    currentSongTransposition = 0;

    // Atualizar na interface
    const content = document.getElementById('songDetailContent');
    content.innerHTML = CifrasJS.formatSongContent(originalSongContent);

    // Atualizar informação de tom
    updateTranspositionInfo();
}

// Atualizar informação de tom após transposição
function updateTranspositionInfo() {
    if (!activeSong) return;

    const info = document.getElementById('songDetailInfo');

    // Se não tiver tom definido, não mostrar
    if (!activeSong.key) {
        info.textContent = '';
        return;
    }

    // Calcular novo tom
    let newKey = '';
    if (currentSongTransposition !== 0) {
        const noteIndex = NOTES.indexOf(activeSong.key);
        if (noteIndex !== -1) {
            const newIndex = (noteIndex + currentSongTransposition + 12) % 12;
            newKey = NOTES[newIndex];
        }
    }

    // Montar informação
    const keyInfo = `Tom: ${activeSong.key}${newKey ? ` → ${newKey}` : ''}`;
    const capoInfo = activeSong.capo && activeSong.capo > 0 ? `Capotraste: ${activeSong.capo}ª casa` : '';

    info.textContent = [keyInfo, capoInfo].filter(Boolean).join(' | ');
}

// Salvar música
async function saveSong() {
    // Obter dados do formulário
    const title = document.getElementById('songTitle').value.trim();
    const category = document.getElementById('songCategory').value.trim();
    const cifraClubLink = document.getElementById('songCifraClub').value.trim();
    const letraLink = document.getElementById('songLetra').value.trim();
    const content = document.getElementById('songContent').value.trim();
    const isPublic = document.getElementById('isPublicSong').checked;
    const key = document.getElementById('songKey').value;
    const capo = parseInt(document.getElementById('songCapo').value) || 0;
    const notes = document.getElementById('songNotes').value.trim();

    // Validações
    if (!title) {
        showErrorToast('O título da música é obrigatório');
        return;
    }

    if (!content) {
        showErrorToast('O conteúdo da cifra é obrigatório');
        return;
    }

    // Preparar objeto da música
    const songData = {
        title,
        category,
        cifraClubLink: cifraClubLink || CifrasJS.generateCifraClubUrl(title),
        letraLink,
        content,
        key,
        capo,
        notes,
        isPublic,
        updatedAt: new Date().toISOString()
    };

    // Se for uma edição
    if (editingSongId) {
        await updateExistingSong(editingSongId, songData);
    } else {
        // Adicionar campos para nova música
        songData.createdAt = new Date().toISOString();
        songData.userId = AuthJS.getCurrentUserId() || 'anonymous';
        songData.createdBy = AuthJS.getCurrentUserName() || 'Anônimo';

        await createNewSong(songData);
    }

    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addSongModal'));
    modal.hide();

    // Resetar formulário
    document.getElementById('newSongForm').reset();
    editingSongId = null;
}

// Criar nova música
async function createNewSong(songData) {
    // Se estiver online e autenticado, salvar no Firebase
    if (isOnline && AuthJS.isUserAuthenticated()) {
        try {
            const docRef = await db.collection('songs').add(songData);

            // Adicionar o ID ao objeto
            songData.id = docRef.id;

            // Adicionar à lista local
            allSongs.push(songData);

            showSuccessToast('Música adicionada com sucesso!');

            // Atualizar interface
            updateCategories();
            filterSongs();
        } catch (error) {
            console.error('Erro ao adicionar música:', error);
            showErrorToast('Erro ao adicionar música');

            // Salvar localmente como fallback
            saveLocalSong(songData);
        }
    } else {
        // Salvar localmente
        saveLocalSong(songData);
    }
}

// Salvar música localmente
function saveLocalSong(songData) {
    // Gerar ID local
    songData.id = 'local_' + Date.now();
    songData.isPersonal = true;

    // Adicionar à lista local
    personalSongs.push(songData);

    // Salvar no localStorage
    localStorage.setItem('personalSongs', JSON.stringify(personalSongs));

    showSuccessToast('Música salva localmente');

    // Atualizar interface
    updateCategories();
    filterSongs();
}

// Atualizar música existente
async function updateExistingSong(songId, songData) {
    // Verificar se é uma música do Firebase ou local
    const isFirebaseSong = allSongs.some(s => s.id === songId);

    if (isFirebaseSong && isOnline && AuthJS.isUserAuthenticated()) {
        try {
            await db.collection('songs').doc(songId).update(songData);

            // Atualizar na lista local
            const index = allSongs.findIndex(s => s.id === songId);
            if (index !== -1) {
                allSongs[index] = { ...allSongs[index], ...songData };
            }

            showSuccessToast('Música atualizada com sucesso!');
        } catch (error) {
            console.error('Erro ao atualizar música:', error);
            showErrorToast('Erro ao atualizar música');
        }
    } else {
        // Atualizar música local
        const index = personalSongs.findIndex(s => s.id === songId);
        if (index !== -1) {
            personalSongs[index] = {
                ...personalSongs[index],
                ...songData,
                isPersonal: true
            };

            // Salvar no localStorage
            localStorage.setItem('personalSongs', JSON.stringify(personalSongs));

            showSuccessToast('Música atualizada localmente');
        }
    }

    // Atualizar interface
    updateCategories();
    filterSongs();
}

// Editar música
function editSong(songId) {
    // Encontrar a música
    const song = allSongs.find(s => s.id === songId) || personalSongs.find(s => s.id === songId);
    if (!song) return;

    // Preencher o formulário
    document.getElementById('songTitle').value = song.title || '';
    document.getElementById('songCategory').value = song.category || '';
    document.getElementById('songCifraClub').value = song.cifraClubLink || '';
    document.getElementById('songLetra').value = song.letraLink || '';
    document.getElementById('songContent').value = song.content || '';
    document.getElementById('isPublicSong').checked = song.isPublic || false;
    document.getElementById('songKey').value = song.key || '';
    document.getElementById('songCapo').value = song.capo || '0';
    document.getElementById('songNotes').value = song.notes || '';

    // Atualizar título do modal
    document.getElementById('addSongModalLabel').textContent = 'Editar Música';

    // Salvar ID para edição
    editingSongId = songId;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('addSongModal'));
    modal.show();
}

// Confirmar exclusão de música
function confirmDeleteSong(songId) {
    if (confirm('Tem certeza que deseja excluir esta música?')) {
        deleteSong(songId);
    }
}

// Excluir música
async function deleteSong(songId) {
    // Verificar se é uma música do Firebase ou local
    const isFirebaseSong = allSongs.some(s => s.id === songId);

    if (isFirebaseSong && isOnline && AuthJS.isUserAuthenticated()) {
        try {
            await db.collection('songs').doc(songId).delete();

            // Remover da lista local
            allSongs = allSongs.filter(s => s.id !== songId);

            showSuccessToast('Música excluída com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir música:', error);
            showErrorToast('Erro ao excluir música');
        }
    } else {
        // Remover música local
        personalSongs = personalSongs.filter(s => s.id !== songId);

        // Salvar no localStorage
        localStorage.setItem('personalSongs', JSON.stringify(personalSongs));

        showSuccessToast('Música excluída localmente');
    }

    // Remover de playlists
    removeFromAllPlaylists(songId);

    // Atualizar interface
    updateCategories();
    filterSongs();
}

// Remover música de todas as playlists
function removeFromAllPlaylists(songId) {
    let playlistsChanged = false;

    // Remover de playlists locais
    personalPlaylists.forEach(playlist => {
        if (playlist.songs && playlist.songs.includes(songId)) {
            playlist.songs = playlist.songs.filter(id => id !== songId);
            playlistsChanged = true;
        }
    });

    if (playlistsChanged) {
        // Salvar no localStorage
        localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));

        // Atualizar no Firebase se estiver online
        if (isOnline && AuthJS.isUserAuthenticated()) {
            personalPlaylists.forEach(playlist => {
                if (!playlist.id.startsWith('local_')) {
                    db.collection('playlists').doc(playlist.id).update({
                        songs: playlist.songs
                    }).catch(error => {
                        console.error('Erro ao atualizar playlist:', error);
                    });
                }
            });
        }
    }
}

// Mostrar todas as músicas
function showAllSongs() {
    // Limpar playlist atual
    currentPlaylist = null;

    // Esconder cabeçalho da playlist
    document.getElementById('activePlaylistHeader').classList.add('d-none');

    // Mostrar todas as músicas
    filterSongs();
}

// Mostrar favoritos
function showFavorites() {
    // Verificar se há favoritos
    const favorites = [...allSongs, ...personalSongs].filter(song => song.isFavorite);

    if (favorites.length === 0) {
        showErrorToast('Você ainda não tem músicas favoritas');
        return;
    }

    // Criar playlist virtual
    currentPlaylist = {
        name: 'Favoritos',
        description: 'Suas músicas favoritas',
        songs: favorites.map(song => song.id)
    };

    // Mostrar cabeçalho
    const header = document.getElementById('activePlaylistHeader');
    const nameEl = document.getElementById('activePlaylistName');
    const descriptionEl = document.getElementById('activePlaylistDescription');

    nameEl.textContent = currentPlaylist.name;
    descriptionEl.textContent = currentPlaylist.description;

    // Esconder botões de edição
    document.getElementById('btnEditPlaylist').style.display = 'none';
    document.getElementById('btnSharePlaylist').style.display = 'none';

    header.classList.remove('d-none');

    // Filtrar músicas
    filterSongs();
}

// Mostrar playlist
function showPlaylist(playlistId) {
    // Encontrar a playlist
    const playlist = publicPlaylists.find(p => p.id === playlistId) ||
        personalPlaylists.find(p => p.id === playlistId);

    if (!playlist) return;

    // Definir playlist atual
    currentPlaylist = playlist;

    // Mostrar cabeçalho
    const header = document.getElementById('activePlaylistHeader');
    const nameEl = document.getElementById('activePlaylistName');
    const descriptionEl = document.getElementById('activePlaylistDescription');

    nameEl.textContent = playlist.name;
    descriptionEl.textContent = playlist.description || '';

    // Mostrar/esconder botões de edição
    const isOwner = playlist.userId === AuthJS.getCurrentUserId();
    document.getElementById('btnEditPlaylist').style.display = isOwner ? 'inline-block' : 'none';
    document.getElementById('btnSharePlaylist').style.display = isOwner || playlist.isPublic ? 'inline-block' : 'none';

    // Configurar evento para editar playlist
    if (isOwner) {
        document.getElementById('btnEditPlaylist').onclick = () => {
            editPlaylist(playlistId);
        };
    }

    // Configurar evento para compartilhar playlist
    document.getElementById('btnSharePlaylist').onclick = () => {
        sharePlaylist(playlistId);
    };

    header.classList.remove('d-none');

    // Filtrar músicas
    filterSongs();
}

// Editar playlist
function editPlaylist(playlistId) {
    // Encontrar a playlist
    const playlist = personalPlaylists.find(p => p.id === playlistId);
    if (!playlist) return;

    // Preencher o formulário
    document.getElementById('playlistName').value = playlist.name || '';
    document.getElementById('playlistDescription').value = playlist.description || '';
    document.getElementById('isPublicPlaylist').checked = playlist.isPublic || false;

    // Atualizar título do modal
    document.getElementById('playlistModalLabel').textContent = 'Editar Lista';

    // Salvar ID para edição
    editingPlaylistId = playlistId;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('playlistModal'));
    modal.show();
}

// Compartilhar playlist
function sharePlaylist(playlistId) {
    // Implementar compartilhamento
    const url = `${window.location.origin}${window.location.pathname}?playlist=${playlistId}`;

    // Copiar para área de transferência
    navigator.clipboard.writeText(url)
        .then(() => {
            showSuccessToast('Link copiado para a área de transferência');
        })
        .catch(() => {
            // Fallback para navegadores que não suportam clipboard API
            prompt('Copie o link abaixo para compartilhar a lista:', url);
        });
}

// Mostrar modal de criação de playlist
function showCreatePlaylistModal(initialSongId = null) {
    // Limpar formulário
    document.getElementById('playlistForm').reset();

    // Resetar título do modal
    document.getElementById('playlistModalLabel').textContent = 'Nova Lista';

    // Limpar ID de edição
    editingPlaylistId = null;

    // Salvar ID da música inicial (se fornecido)
    if (initialSongId) {
        document.getElementById('playlistForm').dataset.initialSongId = initialSongId;
    } else {
        delete document.getElementById('playlistForm').dataset.initialSongId;
    }

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('playlistModal'));
    modal.show();
}

// Salvar playlist
async function savePlaylist() {
    // Obter dados do formulário
    const name = document.getElementById('playlistName').value.trim();
    const description = document.getElementById('playlistDescription').value.trim();
    const isPublic = document.getElementById('isPublicPlaylist').checked;

    // Obter música inicial (se houver)
    const initialSongId = document.getElementById('playlistForm').dataset.initialSongId;

    // Validações
    if (!name) {
        showErrorToast('O nome da lista é obrigatório');
        return;
    }

    // Preparar objeto da playlist
    const playlistData = {
        name,
        description,
        isPublic,
        songs: initialSongId ? [initialSongId] : [],
        updatedAt: new Date().toISOString()
    };

    // Se for uma edição
    if (editingPlaylistId) {
        await updateExistingPlaylist(editingPlaylistId, playlistData);
    } else {
        // Adicionar campos para nova playlist
        playlistData.createdAt = new Date().toISOString();
        playlistData.userId = AuthJS.getCurrentUserId() || 'anonymous';
        playlistData.createdBy = AuthJS.getCurrentUserName() || 'Anônimo';

        await createNewPlaylist(playlistData);
    }

    // Fechar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('playlistModal'));
    modal.hide();

    // Resetar formulário
    document.getElementById('playlistForm').reset();
    editingPlaylistId = null;
}

// Criar nova playlist
async function createNewPlaylist(playlistData) {
    // Se estiver online e autenticado, salvar no Firebase
    if (isOnline && AuthJS.isUserAuthenticated()) {
        try {
            const docRef = await db.collection('playlists').add(playlistData);

            // Adicionar o ID ao objeto
            playlistData.id = docRef.id;

            // Adicionar à lista local
            if (playlistData.isPublic) {
                publicPlaylists.push(playlistData);
            } else {
                personalPlaylists.push(playlistData);
            }

            showSuccessToast('Lista criada com sucesso!');

            // Atualizar interface
            updatePlaylistsDropdown();

            // Mostrar a playlist criada
            showPlaylist(docRef.id);
        } catch (error) {
            console.error('Erro ao criar playlist:', error);
            showErrorToast('Erro ao criar lista');

            // Salvar localmente como fallback
            saveLocalPlaylist(playlistData);
        }
    } else {
        // Salvar localmente
        saveLocalPlaylist(playlistData);
    }
}

// Salvar playlist localmente
function saveLocalPlaylist(playlistData) {
    // Gerar ID local
    playlistData.id = 'local_' + Date.now();

    // Adicionar à lista local
    personalPlaylists.push(playlistData);

    // Salvar no localStorage
    localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));

    showSuccessToast('Lista salva localmente');

    // Atualizar interface
    updatePlaylistsDropdown();

    // Mostrar a playlist criada
    showPlaylist(playlistData.id);
}

// Atualizar playlist existente
async function updateExistingPlaylist(playlistId, playlistData) {
    // Verificar se é uma playlist do Firebase ou local
    const isFirebasePlaylist = !playlistId.startsWith('local_');

    if (isFirebasePlaylist && isOnline && AuthJS.isUserAuthenticated()) {
        try {
            await db.collection('playlists').doc(playlistId).update(playlistData);

            // Atualizar na lista local
            let updated = false;

            // Procurar nas playlists públicas
            const publicIndex = publicPlaylists.findIndex(p => p.id === playlistId);
            if (publicIndex !== -1) {
                // Preservar músicas existentes
                const existingSongs = publicPlaylists[publicIndex].songs || [];

                // Se a visibilidade mudou, mover para a outra lista
                if (!playlistData.isPublic) {
                    const playlist = {
                        ...publicPlaylists[publicIndex],
                        ...playlistData,
                        songs: existingSongs
                    };

                    // Remover da lista pública
                    publicPlaylists.splice(publicIndex, 1);

                    // Adicionar à lista pessoal
                    personalPlaylists.push(playlist);
                } else {
                    // Atualizar no lugar
                    publicPlaylists[publicIndex] = {
                        ...publicPlaylists[publicIndex],
                        ...playlistData,
                        songs: existingSongs
                    };
                }

                updated = true;
            }

            // Procurar nas playlists pessoais
            const personalIndex = personalPlaylists.findIndex(p => p.id === playlistId);
            if (personalIndex !== -1) {
                // Preservar músicas existentes
                const existingSongs = personalPlaylists[personalIndex].songs || [];

                // Se a visibilidade mudou, mover para a outra lista
                if (playlistData.isPublic) {
                    const playlist = {
                        ...personalPlaylists[personalIndex],
                        ...playlistData,
                        songs: existingSongs
                    };

                    // Remover da lista pessoal
                    personalPlaylists.splice(personalIndex, 1);

                    // Adicionar à lista pública
                    publicPlaylists.push(playlist);
                } else {
                    // Atualizar no lugar
                    personalPlaylists[personalIndex] = {
                        ...personalPlaylists[personalIndex],
                        ...playlistData,
                        songs: existingSongs
                    };
                }

                updated = true;
            }

            if (updated) {
                showSuccessToast('Lista atualizada com sucesso!');

                // Atualizar interface
                updatePlaylistsDropdown();

                // Atualizar dados da playlist atual, se for a mesma
                if (currentPlaylist && currentPlaylist.id === playlistId) {
                    showPlaylist(playlistId);
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar playlist:', error);
            showErrorToast('Erro ao atualizar lista');
        }
    } else {
        // Atualizar playlist local
        const index = personalPlaylists.findIndex(p => p.id === playlistId);
        if (index !== -1) {
            // Preservar músicas existentes
            const existingSongs = personalPlaylists[index].songs || [];

            personalPlaylists[index] = {
                ...personalPlaylists[index],
                ...playlistData,
                songs: existingSongs
            };

            // Salvar no localStorage
            localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));

            showSuccessToast('Lista atualizada localmente');

            // Atualizar interface
            updatePlaylistsDropdown();

            // Atualizar dados da playlist atual, se for a mesma
            if (currentPlaylist && currentPlaylist.id === playlistId) {
                showPlaylist(playlistId);
            }
        }
    }
}

// Atualizar dropdown de playlists no menu
function updatePlaylistsDropdown() {
    const dropdown = document.getElementById('playlistsDropdown');

    // Encontrar os separadores fixos
    const publicHeader = Array.from(dropdown.querySelectorAll('h6')).find(h => h.textContent === 'Listas Públicas');
    const personalHeader = Array.from(dropdown.querySelectorAll('h6')).find(h => h.textContent === 'Minhas Listas');
    const createPlaylistItem = document.getElementById('btnCreatePlaylist').parentNode;

    // Limpar listas existentes
    dropdown.querySelectorAll('li a[data-playlist-id]').forEach(a => {
        a.parentNode.remove();
    });

    // Adicionar listas públicas
    if (publicHeader && publicPlaylists.length > 0) {
        publicPlaylists.forEach(playlist => {
            const li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="#" data-playlist-id="${playlist.id}">${playlist.name}</a>`;

            // Inserir após o cabeçalho
            publicHeader.parentNode.insertAdjacentElement('afterend', li);

            // Adicionar evento de clique
            li.querySelector('a').addEventListener('click', e => {
                e.preventDefault();
                showPlaylist(playlist.id);
            });
        });
    }

    // Adicionar listas pessoais
    if (personalHeader && personalPlaylists.length > 0) {
        personalPlaylists.forEach(playlist => {
            const li = document.createElement('li');
            li.innerHTML = `<a class="dropdown-item" href="#" data-playlist-id="${playlist.id}">${playlist.name}</a>`;

            // Inserir após o cabeçalho
            personalHeader.parentNode.insertAdjacentElement('afterend', li);

            // Adicionar evento de clique
            li.querySelector('a').addEventListener('click', e => {
                e.preventDefault();
                showPlaylist(playlist.id);
            });
        });
    }
}

// Alternar favorito
function toggleFavorite(songId) {
    // Encontrar a música
    let song = allSongs.find(s => s.id === songId);
    let isFirebaseSong = !!song;

    if (!song) {
        song = personalSongs.find(s => s.id === songId);
        if (!song) return;
    }

    // Alternar estado
    song.isFavorite = !song.isFavorite;

    // Atualizar UI
    const favBtns = document.querySelectorAll(`.btn-favorite[data-song-id="${songId}"]`);
    favBtns.forEach(btn => {
        btn.classList.toggle('active', song.isFavorite);
    });

    // Salvar alteração
    if (isFirebaseSong && isOnline && AuthJS.isUserAuthenticated()) {
        db.collection('songs').doc(songId).update({
            isFavorite: song.isFavorite
        }).catch(error => {
            console.error('Erro ao atualizar favorito:', error);
        });
    } else if (!isFirebaseSong) {
        // Salvar no localStorage
        localStorage.setItem('personalSongs', JSON.stringify(personalSongs));
    }

    // Se estiver na lista de favoritos, atualizar
    if (currentPlaylist && currentPlaylist.name === 'Favoritos') {
        if (!song.isFavorite) {
            // Remover da lista atual
            currentPlaylist.songs = currentPlaylist.songs.filter(id => id !== songId);

            if (currentPlaylist.songs.length === 0) {
                showAllSongs();
                return;
            }
        }

        filterSongs();
    }
}

// Carregar dados
function loadData() {
    // Carregar dados do localStorage
    loadLocalData();

    // Carregar dados do Firebase se estiver online e autenticado
    if (isOnline && AuthJS.isUserAuthenticated()) {
        loadFirebaseData();
    }
}

// Carregar dados do localStorage
function loadLocalData() {
    // Carregar músicas
    const storedSongs = localStorage.getItem('personalSongs');
    if (storedSongs) {
        try {
            personalSongs = JSON.parse(storedSongs);
        } catch (error) {
            console.error('Erro ao carregar músicas locais:', error);
            personalSongs = [];
        }
    }

    // Carregar playlists
    const storedPlaylists = localStorage.getItem('personalPlaylists');
    if (storedPlaylists) {
        try {
            personalPlaylists = JSON.parse(storedPlaylists);
        } catch (error) {
            console.error('Erro ao carregar playlists locais:', error);
            personalPlaylists = [];
        }
    }

    // Atualizar interface
    updateCategories();
    updatePlaylistsDropdown();
    filterSongs();
}

// Carregar dados do Firebase
function loadFirebaseData() {
    const userId = AuthJS.getCurrentUserId();

    // Limpar o array de músicas
    songs = [];

    // Carregar músicas públicas
    let publicSongsPromise = db.collection('songs')
        .where("isPublic", "==", true)
        .get();

    // Carregar músicas do usuário atual (se estiver logado)
    let userSongsPromise = Promise.resolve({ empty: true });
    if (userId) {
        userSongsPromise = db.collection('songs')
            .where("userId", "==", userId)
            .get();
    }

    // Processar ambas as consultas
    Promise.all([publicSongsPromise, userSongsPromise])
        .then(([publicSnapshots, userSnapshots]) => {
            // Processar músicas públicas
            publicSnapshots.forEach(doc => {
                const song = { id: doc.id, ...doc.data() };
                if (!songs.some(s => s.id === song.id)) {
                    songs.push(song);
                }
            });

            // Processar músicas do usuário
            if (!userSnapshots.empty) {
                userSnapshots.forEach(doc => {
                    const song = { id: doc.id, ...doc.data() };
                    if (!songs.some(s => s.id === song.id)) {
                        songs.push(song);
                    }
                });
            }

            console.log(`Carregadas ${songs.length} músicas do Firestore`);

            // Carregar playlists
            loadPlaylists();

            // Atualizar a interface
            updateCategoriesDropdown();
            filterSongs();
        })
        .catch(error => {
            console.error("Erro ao carregar dados do Firebase:", error);
            showErrorToast("Erro ao carregar dados do Firebase. Tente novamente mais tarde.");
        });
}

function loadPlaylists() {
    // Não verificar/declarar as variáveis aqui, pois já estão declaradas no escopo global

    // Limpar listas anteriores
    publicPlaylists = [];
    personalPlaylists = [];

    // Carregar playlists públicas
    let publicPlaylistsPromise = db.collection('playlists')
        .where("isPublic", "==", true)
        .get();

    // Carregar playlists do usuário
    let userPlaylistsPromise = Promise.resolve({ empty: true });
    if (AuthJS.isUserAuthenticated()) {
        userPlaylistsPromise = db.collection('playlists')
            .where("userId", "==", AuthJS.getCurrentUserId())
            .get();
    }

    Promise.all([publicPlaylistsPromise, userPlaylistsPromise])
        .then(([publicSnapshots, userSnapshots]) => {
            // Processar playlists públicas
            publicSnapshots.forEach(doc => {
                const playlist = { id: doc.id, ...doc.data() };
                publicPlaylists.push(playlist);
            });

            // Processar playlists do usuário
            if (!userSnapshots.empty) {
                userSnapshots.forEach(doc => {
                    const playlist = { id: doc.id, ...doc.data() };
                    // Evitar duplicatas (caso uma playlist pessoal seja pública)
                    if (!publicPlaylists.some(p => p.id === playlist.id)) {
                        personalPlaylists.push(playlist);
                    }
                });
            }

            // Adicionar playlists locais (do localStorage)
            const localPlaylists = JSON.parse(localStorage.getItem('personalPlaylists') || '[]');
            localPlaylists.forEach(playlist => {
                if (playlist.id.startsWith('local_')) {
                    personalPlaylists.push(playlist);
                }
            });

            // Atualizar dropdown de playlists
            updatePlaylistsDropdown();
        })
        .catch(error => {
            console.error("Erro ao carregar playlists:", error);
            showErrorToast("Erro ao carregar listas de músicas.");
        });
}

// Sincronizar dados locais com o Firebase
function syncData() {
    if (!isOnline || !AuthJS.isUserAuthenticated()) return;

    // Carregar dados do Firebase
    loadFirebaseData();

    // Sincronizar músicas locais
    const localSongsToSync = personalSongs.filter(s => s.id.startsWith('local_'));

    if (localSongsToSync.length > 0) {
        showSuccessToast(`Sincronizando ${localSongsToSync.length} músicas locais...`);

        localSongsToSync.forEach(song => {
            // Remover propriedades locais
            const { id, isPersonal, ...songData } = song;

            // Adicionar dados do usuário
            songData.userId = AuthJS.getCurrentUserId();
            songData.createdBy = AuthJS.getCurrentUserName();

            // Salvar no Firebase
            db.collection('songs').add(songData)
                .then(docRef => {
                    console.log('Música sincronizada:', docRef.id);

                    // Atualizar referências em playlists
                    updatePlaylistReferences(id, docRef.id);

                    // Remover da lista local
                    personalSongs = personalSongs.filter(s => s.id !== id);

                    // Salvar no localStorage
                    localStorage.setItem('personalSongs', JSON.stringify(personalSongs));
                })
                .catch(error => {
                    console.error('Erro ao sincronizar música:', error);
                });
        });
    }

    // Sincronizar playlists locais
    const localPlaylistsToSync = personalPlaylists.filter(p => p.id.startsWith('local_'));

    if (localPlaylistsToSync.length > 0) {
        showSuccessToast(`Sincronizando ${localPlaylistsToSync.length} listas locais...`);

        localPlaylistsToSync.forEach(playlist => {
            // Remover propriedades locais
            const { id, ...playlistData } = playlist;

            // Adicionar dados do usuário
            playlistData.userId = AuthJS.getCurrentUserId();
            playlistData.createdBy = AuthJS.getCurrentUserName();

            // Salvar no Firebase
            db.collection('playlists').add(playlistData)
                .then(docRef => {
                    console.log('Playlist sincronizada:', docRef.id);

                    // Remover da lista local
                    personalPlaylists = personalPlaylists.filter(p => p.id !== id);

                    // Salvar no localStorage
                    localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));
                })
                .catch(error => {
                    console.error('Erro ao sincronizar playlist:', error);
                });
        });
    }
}

// Atualizar referências em playlists
function updatePlaylistReferences(oldId, newId) {
    let changed = false;

    personalPlaylists.forEach(playlist => {
        if (playlist.songs && playlist.songs.includes(oldId)) {
            // Substituir ID antigo pelo novo
            playlist.songs = playlist.songs.map(id => id === oldId ? newId : id);
            changed = true;
        }
    });

    if (changed) {
        // Salvar no localStorage
        localStorage.setItem('personalPlaylists', JSON.stringify(personalPlaylists));

        // Atualizar no Firebase
        personalPlaylists.forEach(playlist => {
            if (!playlist.id.startsWith('local_')) {
                db.collection('playlists').doc(playlist.id).update({
                    songs: playlist.songs
                }).catch(error => {
                    console.error('Erro ao atualizar referências da playlist:', error);
                });
            }
        });
    }
}

// Importar cifra do Cifra Club
async function importCifraFromUrl() {
    const url = document.getElementById('songCifraClub').value.trim();

    if (!url || !url.includes('cifraclub.com.br')) {
        showErrorToast('URL inválida. Insira uma URL do Cifra Club');
        return;
    }

    document.getElementById('btnImportCifra').disabled = true;
    document.getElementById('btnImportCifra').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Esta parte seria implementada com um proxy ou API para fazer o scraping
        // Como não temos isso, vamos simular com um alerta
        showErrorToast('Função de importação ainda não implementada');

        // O ideal seria ter um backend para fazer o scraping:
        /*
        const response = await fetch('/api/import-cifra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Erro ao importar cifra');
        }

        const data = await response.json();

        // Preencher o formulário
        document.getElementById('songTitle').value = data.title || '';
        document.getElementById('songContent').value = data.content || '';
        document.getElementById('songKey').value = data.key || '';
        document.getElementById('songCapo').value = data.capo || '0';
        */
    } catch (error) {
        console.error('Erro ao importar cifra:', error);
        showErrorToast('Erro ao importar cifra');
    } finally {
        document.getElementById('btnImportCifra').disabled = false;
        document.getElementById('btnImportCifra').innerHTML = 'Importar';
    }
}

// Importar músicas de JSON
function importSongsFromJson() {
    try {
        const jsonText = document.getElementById('jsonInput').value.trim();
        if (!jsonText) {
            showErrorToast('Por favor, insira o JSON das músicas.');
            return;
        }

        const songsData = JSON.parse(jsonText);

        if (!Array.isArray(songsData)) {
            showErrorToast('O JSON deve ser um array de músicas.');
            return;
        }

        const isPublic = document.getElementById('isPublicImport').checked;
        let importedCount = 0;
        let errorCount = 0;

        // Processar cada música
        songsData.forEach(songData => {
            if (!songData.title || !songData.content) {
                errorCount++;
                console.error('Música sem título ou conteúdo:', songData);
                return;
            }

            const newSong = {
                title: songData.title,
                category: songData.category || '',
                cifraClubLink: songData.cifraClubLink || CifrasJS.generateCifraClubUrl(songData.title),
                letraLink: songData.letraLink || '',
                content: songData.content,
                key: songData.key || '',
                capo: songData.capo || 0,
                notes: songData.notes || '',
                isPublic: isPublic,
                createdAt: new Date().toISOString(),
                userId: AuthJS.getCurrentUserId() || 'anonymous',
                createdBy: AuthJS.getCurrentUserName() || 'Anônimo'
            };

            // Se estiver online e logado, salvar no Firebase
            if (isOnline && AuthJS.isUserAuthenticated()) {
                db.collection('songs').add(newSong)
                    .then(docRef => {
                        importedCount++;

                        // Adicionar à lista local
                        allSongs.push({
                            id: docRef.id,
                            ...newSong
                        });

                        if (importedCount + errorCount === songsData.length) {
                            showImportResults(importedCount, errorCount);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao importar música:', error);
                        errorCount++;

                        if (importedCount + errorCount === songsData.length) {
                            showImportResults(importedCount, errorCount);
                        }
                    });
            } else {
                // Caso offline ou não logado, salvar localmente
                const newSongWithId = {
                    id: 'local_' + Date.now() + '_' + importedCount,
                    ...newSong,
                    isPersonal: true
                };

                personalSongs.push(newSongWithId);
                importedCount++;

                if (importedCount + errorCount === songsData.length) {
                    // Salvar no localStorage
                    localStorage.setItem('personalSongs', JSON.stringify(personalSongs));
                    showImportResults(importedCount, errorCount);
                }
            }
        });

        // Se não houver músicas para processar
        if (songsData.length === 0) {
            showErrorToast('Nenhuma música encontrada no JSON.');
        }

        // Atualizar categorias e filtrar músicas
        updateCategories();
        filterSongs();

    } catch (error) {
        console.error('Erro ao processar JSON:', error);
        showErrorToast('Erro ao processar o JSON. Verifique o formato e tente novamente.');
    }
}

// Mostrar resultados da importação
function showImportResults(importedCount, errorCount) {
    const modal = bootstrap.Modal.getInstance(document.getElementById('importJsonModal'));
    modal.hide();

    if (errorCount > 0) {
        showErrorToast(`Importação concluída: ${importedCount} músicas importadas, ${errorCount} erros.`);
    } else {
        showSuccessToast(`Importação concluída: ${importedCount} músicas importadas com sucesso!`);
    }
}

// Mostrar modal de adição de música
function showAddSongModal() {
    // Resetar formulário
    document.getElementById('newSongForm').reset();

    // Resetar título do modal
    document.getElementById('addSongModalLabel').textContent = 'Adicionar Nova Música';

    // Limpar ID de edição
    editingSongId = null;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('addSongModal'));
    modal.show();
}

// Mostrar modal de conta
function showAccountModal() {
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('accountModal'));
    modal.show();
}

// Alternar entre formulários de login e registro
function toggleAuthForms(form) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (form === 'register') {
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
        document.getElementById('accountModalLabel').textContent = 'Criar Conta';
    } else {
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
        document.getElementById('accountModalLabel').textContent = 'Entrar';
    }
}

// Login com email e senha
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showErrorToast('Preencha todos os campos');
        return;
    }

    const result = await AuthJS.login(email, password);

    if (result.success) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
        modal.hide();

        // Limpar formulário
        document.getElementById('loginForm').reset();
    } else {
        showErrorToast(result.error);
    }
}

// Login com Google
async function loginWithGoogle() {
    const result = await AuthJS.loginWithGoogle();

    if (result.success) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
        modal.hide();
    } else {
        showErrorToast(result.error);
    }
}

// Registrar novo usuário
async function registerUser() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !password) {
        showErrorToast('Preencha todos os campos');
        return;
    }

    const result = await AuthJS.register(name, email, password);

    if (result.success) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
        modal.hide();

        // Limpar formulário
        document.getElementById('registerForm').reset();
    } else {
        showErrorToast(result.error);
    }
}

// Logout
async function logoutUser() {
    const result = await AuthJS.logout();

    if (result.success) {
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountModal'));
        modal.hide();
    } else {
        showErrorToast(result.error);
    }
}

// Mostrar modal de exportação de músicas
function showExportSongsModal() {
    // Verificar se é administrador
    if (!AuthJS.isUserAdmin()) {
        showErrorToast('Você não tem permissão para acessar esta função');
        return;
    }

    // Exportar todas as músicas inicialmente
    exportSongs('all');

    // Configurar listeners para os radiobuttons
    document.querySelectorAll('input[name="exportFilter"]').forEach(radio => {
        radio.addEventListener('change', () => {
            exportSongs(radio.value);
        });
    });

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('exportSongsModal'));
    modal.show();
}

// Exportar músicas
function exportSongs(filter) {
    let songsToExport = [];

    switch (filter) {
        case 'public':
            songsToExport = allSongs.filter(song => song.isPublic);
            break;
        case 'mine':
            songsToExport = allSongs.filter(song => song.userId === AuthJS.getCurrentUserId());
            break;
        case 'all':
        default:
            songsToExport = [...allSongs];
            break;
    }

    // Remover propriedades desnecessárias
    const cleanedSongs = songsToExport.map(({ id, userId, createdBy, createdAt, updatedAt, isPersonal, isFavorite, ...rest }) => rest);

    // Converter para JSON
    const jsonOutput = JSON.stringify(cleanedSongs, null, 2);

    // Atualizar na interface
    document.getElementById('exportJsonOutput').value = jsonOutput;
}

// Copiar JSON exportado
function copyExportedJson() {
    const textarea = document.getElementById('exportJsonOutput');
    textarea.select();
    document.execCommand('copy');
    showSuccessToast('JSON copiado para a área de transferência');
}

// Baixar JSON exportado
function downloadExportedJson() {
    const jsonContent = document.getElementById('exportJsonOutput').value;
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `cifras-filhos-de-maria-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Mostrar modal de importação JSON
function showImportJsonModal() {
    // Resetar formulário
    document.getElementById('jsonInput').value = '';
    document.getElementById('isPublicImport').checked = true;

    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('importJsonModal'));
    modal.show();
}

// Mostrar toast de sucesso
function showSuccessToast(message) {
    const toastEl = document.getElementById('successToast');
    const toastHeader = toastEl.querySelector('.toast-header');
    const toastBody = document.getElementById('toastMessage');

    // Estilo de sucesso
    toastHeader.classList.remove('bg-danger');
    toastHeader.classList.add('bg-success');
    toastHeader.querySelector('i').className = 'fas fa-check-circle me-2';
    toastHeader.querySelector('strong').textContent = 'Sucesso';

    toastBody.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Mostrar toast de erro
function showErrorToast(message) {
    const toastEl = document.getElementById('errorToast');
    const toastBody = document.getElementById('errorToastMessage');

    toastBody.textContent = message;

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Mostrar toast de offline
function showOfflineToast() {
    const toast = new bootstrap.Toast(document.getElementById('offlineToast'));
    toast.show();
}

// Verificar parâmetros da URL
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    // Verificar se há uma playlist especificada
    const playlistId = urlParams.get('playlist');
    if (playlistId) {
        // Mostrar a playlist especificada (após carregar dados)
        setTimeout(() => {
            showPlaylist(playlistId);
        }, 1000);
    }
}

// Carregar dados quando o usuário estiver autenticado
// Esta função é chamada pelo AuthJS quando o estado de autenticação muda
function loadOfflineData() {
    loadLocalData();
    checkUrlParams();
}

// Inicializar dados após autenticação (chamado pelo AuthJS)
function syncData() {
    loadData();
    checkUrlParams();
}
