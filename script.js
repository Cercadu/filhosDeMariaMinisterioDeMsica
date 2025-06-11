// Aplicativo Vue
const app = Vue.createApp({
    data() {
        return {
            publicSongs: [],      // Cifras públicas (compartilhadas)
            personalSongs: [],    // Cifras pessoais (apenas no dispositivo)
            filteredSongs: [],
            categories: [],
            searchText: '',
            selectedCategory: 'all',
            favoriteIds: [],
            showOnlyFavorites: false,
            showOnlyPersonal: false,  // Novo estado para mostrar apenas cifras pessoais
            currentSong: null,
            deferredPrompt: null,
            isOnline: navigator.onLine,
            notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
            originalContent: '',
            transposition: 0,
            lastUpdate: null,      // Data da última atualização das cifras públicas
            isAddingNewSong: false, // Flag para o modal de adicionar música
            newSong: {             // Objeto para nova música
                titulo: '',
                categoria: '',
                linkCifraClub: '',
                linkLetra: '',
                conteudo: ''
            }
        };
    },

    mounted() {
        // Carregar dados do JSON público e das cifras pessoais
        this.loadSongsData();
        this.loadPersonalSongs();

        // Inicializar favoritos do localStorage
        this.loadFavorites();

        // Detectar status online/offline
        window.addEventListener('online', this.updateOnlineStatus);
        window.addEventListener('offline', this.updateOnlineStatus);

        // Escutar evento para instalação de PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            document.getElementById('btnInstalar').style.display = 'block';
        });

        // Eventos de busca e filtros
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchText = e.target.value;
            this.filterSongs();
        });

        document.getElementById('btnFavoritos').addEventListener('click', (e) => {
            e.preventDefault();
            this.showOnlyFavorites = !this.showOnlyFavorites;
            e.target.classList.toggle('active');
            this.filterSongs();
        });

        document.getElementById('btnPersonal').addEventListener('click', (e) => {
            e.preventDefault();
            this.showOnlyPersonal = !this.showOnlyPersonal;
            e.target.classList.toggle('active');
            this.filterSongs();
        });

        document.getElementById('btnInstalar').addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            this.deferredPrompt.prompt();
            const choiceResult = await this.deferredPrompt.userChoice;
            this.deferredPrompt = null;
            document.getElementById('btnInstalar').style.display = 'none';
        });

        // Eventos de transposição
        document.getElementById('btnTransposeUp').addEventListener('click', () => {
            this.transposeSong(1);
        });

        document.getElementById('btnTransposeDown').addEventListener('click', () => {
            this.transposeSong(-1);
        });

        document.getElementById('btnOriginalKey').addEventListener('click', () => {
            this.resetToOriginal();
        });

        // Adicionar música pessoal
        document.getElementById('btnAddSong').addEventListener('click', () => {
            this.isAddingNewSong = true;
            this.newSong = {
                titulo: '',
                categoria: '',
                linkCifraClub: '',
                linkLetra: '',
                conteudo: ''
            };

            // Exibir modal
            const modal = new bootstrap.Modal(document.getElementById('addSongModal'));
            modal.show();
        });

        document.getElementById('btnSaveNewSong').addEventListener('click', () => {
            this.saveNewPersonalSong();
        });

        // Verificar atualizações das cifras públicas (a cada 1 hora quando estiver online)
        setInterval(() => {
            if (navigator.onLine) {
                this.checkForUpdates();
            }
        }, 3600000); // 1 hora
    },

    methods: {
        async loadSongsData() {
            try {
                const response = await fetch('https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/songs.json');
                const data = await response.json();
                this.publicSongs = data;

                // Salvar no localStorage para uso offline
                localStorage.setItem('cachedPublicSongs', JSON.stringify(data));
                localStorage.setItem('lastUpdate', new Date().toISOString());
                this.lastUpdate = new Date();

                this.updateAllCategories();
                this.filterSongs();
            } catch (error) {
                console.error('Erro ao carregar músicas públicas:', error);

                // Tentar carregar do cache se estiver offline
                const cachedSongs = localStorage.getItem('cachedPublicSongs');
                if (cachedSongs) {
                    this.publicSongs = JSON.parse(cachedSongs);
                    const lastUpdateStr = localStorage.getItem('lastUpdate');
                    this.lastUpdate = lastUpdateStr ? new Date(lastUpdateStr) : null;
                    this.updateAllCategories();
                    this.filterSongs();
                }
            }
        },

        loadPersonalSongs() {
            const storedSongs = localStorage.getItem('personalSongs');
            if (storedSongs) {
                this.personalSongs = JSON.parse(storedSongs);
            }
            this.updateAllCategories();
            this.filterSongs();
        },

        updateAllCategories() {
            // Extrair categorias únicas das músicas públicas e pessoais
            const publicCategories = this.publicSongs.map(song => song.categoria);
            const personalCategories = this.personalSongs.map(song => song.categoria);
            const allCategories = [...publicCategories, ...personalCategories];
            this.categories = [...new Set(allCategories)].filter(cat => cat); // Remover valores vazios

            // Preencher dropdown de categorias
            const dropdown = document.getElementById('categoryDropdown');
            dropdown.innerHTML = '<li><a class="dropdown-item active" href="#" data-category="all">Todas as categorias</a></li>';

            this.categories.forEach(category => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.classList.add('dropdown-item');
                a.href = '#';
                a.textContent = category;
                a.dataset.category = category;
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectedCategory = category;
                    document.querySelectorAll('#categoryDropdown .dropdown-item').forEach(
                        item => item.classList.remove('active')
                    );
                    e.target.classList.add('active');
                    this.filterSongs();
                });
                li.appendChild(a);
                dropdown.appendChild(li);
            });
        },

        filterSongs() {
            // Combinar cifras públicas e pessoais
            let allSongs = [...this.publicSongs];

            // Adicionar as cifras pessoais, marcando-as como pessoais
            this.personalSongs.forEach(song => {
                allSongs.push({
                    ...song,
                    isPersonal: true
                });
            });

            // Filtrar por modo (pessoal ou todas)
            if (this.showOnlyPersonal) {
                allSongs = allSongs.filter(song => song.isPersonal);
            }

            // Filtrar por texto de busca
            if (this.searchText) {
                const searchLower = this.searchText.toLowerCase();
                allSongs = allSongs.filter(song =>
                    song.titulo.toLowerCase().includes(searchLower)
                );
            }

            // Filtrar por categoria
            if (this.selectedCategory !== 'all') {
                allSongs = allSongs.filter(song =>
                    song.categoria === this.selectedCategory
                );
            }

            // Filtrar apenas favoritos
            if (this.showOnlyFavorites) {
                allSongs = allSongs.filter(song =>
                    this.favoriteIds.includes(song.id)
                );
            }

            this.filteredSongs = allSongs;
            this.renderSongsList();
        },

        renderSongsList() {
            const container = document.getElementById('songsList');
            container.innerHTML = '';

            this.filteredSongs.forEach(song => {
                const col = document.createElement('div');
                col.className = 'col-md-4 col-sm-6 mb-4';

                const isFavorite = this.favoriteIds.includes(song.id);
                const favoriteClass = isFavorite ? 'active' : '';
                const personalBadge = song.isPersonal ?
                    '<span class="badge bg-primary position-absolute top-0 start-0 m-2">Pessoal</span>' : '';

                // Gerar URLs para Cifra Club e Letras.mus.br dinamicamente
                const cifraClubUrl = song.linkCifraClub || this.generateCifraClubUrl(song.titulo);
                const letrasUrl = song.linkLetra || this.generateLetrasUrl(song.titulo);

                // Criar card HTML para cada música
                col.innerHTML = `
          <div class="card song-card">
            ${personalBadge}
            <div class="card-body" data-song-id="${song.id}">
              <button class="btn-favorite ${favoriteClass}" data-song-id="${song.id}">
                <i class="fas fa-star"></i>
              </button>
              ${song.isPersonal ? `
              <button class="btn-edit position-absolute top-0 end-4 m-2" data-song-id="${song.id}">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-delete position-absolute top-0 end-1 m-2" data-song-id="${song.id}">
                <i class="fas fa-trash"></i>
              </button>
              ` : ''}
              <h5 class="card-title">${song.titulo}</h5>
              <p class="card-category">${song.categoria}</p>
              <div class="song-actions mt-2">
                <a href="${cifraClubUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                  <i class="fas fa-guitar"></i> Cifra Club
                </a>
                <a href="${letrasUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                  <i class="fas fa-align-left"></i> Letra
                </a>
              </div>
            </div>
          </div>
        `;

                container.appendChild(col);

                // Adicionar eventos após inserir no DOM
                const btnFavorite = col.querySelector('.btn-favorite');
                btnFavorite.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleFavorite(song.id);
                    btnFavorite.classList.toggle('active');
                });

                if (song.isPersonal) {
                    const btnEdit = col.querySelector('.btn-edit');
                    if (btnEdit) {
                        btnEdit.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.editPersonalSong(song);
                        });
                    }

                    const btnDelete = col.querySelector('.btn-delete');
                    if (btnDelete) {
                        btnDelete.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.deletePersonalSong(song.id);
                        });
                    }
                }

                const cardBody = col.querySelector('.card-body');
                cardBody.addEventListener('click', () => {
                    this.showSongDetails(song);
                });
            });
        },

        showSongDetails(song) {
            this.currentSong = song;
            this.transposition = 0;

            // Preparar conteúdo para o modal
            const modal = new bootstrap.Modal(document.getElementById('songDetailModal'));
            document.getElementById('songDetailTitle').textContent = song.titulo;

            // Adicionar badge para cifras pessoais
            const titleEl = document.getElementById('songDetailTitle');
            titleEl.innerHTML = song.titulo;
            if (song.isPersonal) {
                titleEl.innerHTML += ' <span class="badge bg-primary">Pessoal</span>';
            }

            // Se a música tiver conteúdo, mostrar; caso contrário, mostrar mensagem
            if (song.conteudo) {
                document.getElementById('songDetailContent').innerHTML = song.conteudo;
                this.originalContent = song.conteudo;
            } else {
                document.getElementById('songDetailContent').innerHTML = `
          <div class="alert alert-info">
            <p>Essa cifra ainda não está disponível no formato texto.</p>
            <p>Você pode acessá-la através dos links abaixo:</p>
            <div class="d-flex justify-content-center gap-3">
              <a href="${song.linkCifraClub || this.generateCifraClubUrl(song.titulo)}" target="_blank" class="btn btn-primary">
                <i class="fas fa-guitar"></i> Ver no Cifra Club
              </a>
              <a href="${song.linkLetra || this.generateLetrasUrl(song.titulo)}" target="_blank" class="btn btn-primary">
                <i class="fas fa-align-left"></i> Ver Letra
              </a>
            </div>
          </div>
        `;
            }

            modal.show();
        },

        saveNewPersonalSong() {
            if (!this.newSong.titulo) {
                alert('Por favor, insira pelo menos o título da música.');
                return;
            }

            const songId = 'personal_' + Date.now(); // ID único
            const newSong = {
                ...this.newSong,
                id: songId,
                isPersonal: true
            };

            // Adicionar à lista de músicas pessoais
            this.personalSongs.push(newSong);

            // Salvar no localStorage
            localStorage.setItem('personalSongs', JSON.stringify(this.personalSongs));

            // Atualizar categorias e filtros
            this.updateAllCategories();
            this.filterSongs();

            // Fechar modal
            const modalEl = document.getElementById('addSongModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            // Mostrar toast de sucesso
            const toastEl = document.getElementById('successToast');
            const toast = new bootstrap.Toast(toastEl);
            document.getElementById('toastMessage').textContent = 'Música adicionada com sucesso!';
            toast.show();
        },

        editPersonalSong(song) {
            this.isAddingNewSong = false;
            this.newSong = { ...song };

            // Mostrar modal de edição
            const modal = new bootstrap.Modal(document.getElementById('addSongModal'));
            document.getElementById('addSongModalLabel').textContent = 'Editar Música';
            modal.show();
        },

        saveEditedPersonalSong() {
            const index = this.personalSongs.findIndex(song => song.id === this.newSong.id);
            if (index !== -1) {
                this.personalSongs[index] = { ...this.newSong };

                // Salvar no localStorage
                localStorage.setItem('personalSongs', JSON.stringify(this.personalSongs));

                // Atualizar categorias e filtros
                this.updateAllCategories();
                this.filterSongs();

                // Fechar modal
                const modalEl = document.getElementById('addSongModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                // Mostrar toast de sucesso
                const toastEl = document.getElementById('successToast');
                const toast = new bootstrap.Toast(toastEl);
                document.getElementById('toastMessage').textContent = 'Música atualizada com sucesso!';
                toast.show();
            }
        },

        deletePersonalSong(id) {
            if (confirm('Tem certeza que deseja excluir esta música?')) {
                const index = this.personalSongs.findIndex(song => song.id === id);
                if (index !== -1) {
                    this.personalSongs.splice(index, 1);

                    // Salvar no localStorage
                    localStorage.setItem('personalSongs', JSON.stringify(this.personalSongs));

                    // Atualizar categorias e filtros
                    this.updateAllCategories();
                    this.filterSongs();

                    // Mostrar toast de sucesso
                    const toastEl = document.getElementById('successToast');
                    const toast = new bootstrap.Toast(toastEl);
                    document.getElementById('toastMessage').textContent = 'Música excluída com sucesso!';
                    toast.show();
                }
            }
        },

        toggleFavorite(songId) {
            const index = this.favoriteIds.indexOf(songId);
            if (index > -1) {
                this.favoriteIds.splice(index, 1);
            } else {
                this.favoriteIds.push(songId);
            }

            // Salvar no localStorage
            localStorage.setItem('favoriteIds', JSON.stringify(this.favoriteIds));

            // Se estiver mostrando apenas favoritos, atualizar a lista
            if (this.showOnlyFavorites) {
                this.filterSongs();
            }
        },

        loadFavorites() {
            const storedFavorites = localStorage.getItem('favoriteIds');
            if (storedFavorites) {
                this.favoriteIds = JSON.parse(storedFavorites);
            }
        },

        generateCifraClubUrl(title) {
            // Formatar título para URL
            const formattedTitle = title
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');

            return `https://www.cifraclub.com.br/${formattedTitle}`;
        },

        generateLetrasUrl(title) {
            // Formatar título para URL
            const formattedTitle = title
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');

            return `https://www.letras.mus.br/${formattedTitle}`;
        },

        updateOnlineStatus() {
            this.isOnline = navigator.onLine;

            // Mostrar toast se offline
            if (!this.isOnline) {
                const toastEl = document.getElementById('offlineToast');
                const toast = new bootstrap.Toast(toastEl);
                toast.show();
            } else {
                // Verificar atualizações quando voltar a ficar online
                this.checkForUpdates();
            }
        },

        async checkForUpdates() {
            // Verificar se há atualizações no JSON remoto
            try {
                const response = await fetch('https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/songs.json', {
                    cache: 'no-store' // Forçar solicitação para o servidor
                });

                if (response.ok) {
                    const data = await response.json();
                    this.publicSongs = data;
                    localStorage.setItem('cachedPublicSongs', JSON.stringify(data));
                    localStorage.setItem('lastUpdate', new Date().toISOString());
                    this.lastUpdate = new Date();

                    // Notificar usuário sobre atualização
                    const toastEl = document.getElementById('successToast');
                    const toast = new bootstrap.Toast(toastEl);
                    document.getElementById('toastMessage').textContent = 'Cifras públicas atualizadas!';
                    toast.show();

                    // Atualizar lista
                    this.updateAllCategories();
                    this.filterSongs();
                }
            } catch (error) {
                console.error('Erro ao verificar atualizações:', error);
            }
        },

        transposeSong(steps) {
            if (!this.currentSong || !this.currentSong.conteudo) return;

            this.transposition += steps;
            const content = document.getElementById('songDetailContent').innerHTML;
            const chordPattern = /<b>([A-G][#b]?)([^<]*)<\/b>/g;

            const transposed = content.replace(chordPattern, (match, base, suffix) => {
                let index = this.notes.indexOf(base);
                if (index !== -1) {
                    index = (index + steps + this.notes.length) % this.notes.length;
                    return `<b>${this.notes[index]}${suffix}</b>`;
                }
                return match;
            });

            document.getElementById('songDetailContent').innerHTML = transposed;
        },

        resetToOriginal() {
            if (!this.originalContent) return;
            this.transposition = 0;
            document.getElementById('songDetailContent').innerHTML = this.originalContent;
        }
    }
});

// Iniciar o app Vue
app.mount('#app');

// Função para preenchimento inicial
(function() {
    // Inicializar elementos necessários antes do Vue montar
    const songsListEl = document.createElement('div');
    songsListEl.id = 'songsList';
    songsListEl.className = 'row';
    document.querySelector('.container').appendChild(songsListEl);

    // Adicionar o elemento raiz para o Vue
    document.body.setAttribute('id', 'app');
})();