// auth.js - Gerenciamento de autenticação e usuários

// Lista de e-mails de administradores
const ADMIN_EMAILS = [
    'cercadurocha1710@gmail.com'
    // Adicione outros e-mails de administradores aqui
];

// Estado do usuário
let currentUser = null;
let isAdmin = false;

// Inicializar autenticação e observar mudanças
function initAuth() {
    // Monitorar estado de autenticação
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUser = user;

            // Verificar se é administrador
            isAdmin = ADMIN_EMAILS.includes(user.email);

            // Atualizar UI
            updateUserUI(user);

            // Mostrar seção de administração para admins
            document.getElementById('adminSection').classList.toggle('d-none', !isAdmin);

            // Carregar dados do usuário
            loadUserData();

            console.log('Usuário autenticado:', user.displayName || user.email);

            // Sincronizar dados do firebase
            syncData();
        } else {
            currentUser = null;
            isAdmin = false;

            // Atualizar UI
            updateUserUI(null);

            // Esconder seção de administração
            document.getElementById('adminSection').classList.add('d-none');

            console.log('Usuário não autenticado');

            // Carregar dados do localStorage
            loadOfflineData();
        }
    });
}

// Atualizar interface do usuário
function updateUserUI(user) {
    const userDisplayName = document.getElementById('userDisplayName');
    const profileUserName = document.getElementById('profileUserName');
    const profileUserEmail = document.getElementById('profileUserEmail');
    const adminBadge = document.getElementById('adminBadge');

    // Formulários
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userProfileSection = document.getElementById('userProfileSection');

    if (user) {
        // Mostrar nome do usuário na navbar
        userDisplayName.textContent = user.displayName || user.email.split('@')[0];

        // Preencher perfil
        profileUserName.textContent = user.displayName || user.email.split('@')[0];
        profileUserEmail.textContent = user.email;

        // Mostrar/esconder badge de admin
        adminBadge.classList.toggle('d-none', !isAdmin);

        // Mostrar perfil
        loginForm.classList.add('d-none');
        registerForm.classList.add('d-none');
        userProfileSection.classList.remove('d-none');
    } else {
        // Reset para estado não autenticado
        userDisplayName.textContent = 'Entrar';

        // Mostrar formulário de login
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
        userProfileSection.classList.add('d-none');
    }
}

// Login com email e senha
async function login(email, password) {
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        return { success: true };
    } catch (error) {
        console.error('Erro no login:', error);
        return {
            success: false,
            error: error.message || 'Erro ao fazer login. Verifique suas credenciais.'
        };
    }
}

// Login com Google
async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await firebase.auth().signInWithPopup(provider);
        return { success: true };
    } catch (error) {
        console.error('Erro no login com Google:', error);
        return {
            success: false,
            error: error.message || 'Erro ao fazer login com Google.'
        };
    }
}

// Cadastrar novo usuário
async function register(name, email, password) {
    try {
        // Criar usuário
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);

        // Atualizar perfil com nome
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Criar documento do usuário no Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            isAdmin: false
        });

        return { success: true };
    } catch (error) {
        console.error('Erro no cadastro:', error);
        return {
            success: false,
            error: error.message || 'Erro ao criar conta. Tente novamente.'
        };
    }
}

// Logout
async function logout() {
    try {
        await firebase.auth().signOut();
        return { success: true };
    } catch (error) {
        console.error('Erro no logout:', error);
        return {
            success: false,
            error: error.message || 'Erro ao sair da conta.'
        };
    }
}

// Carregar dados do usuário
function loadUserData() {
    if (!currentUser) return;

    // Carregar documentos do usuário (favoritos, etc)
    db.collection('users').doc(currentUser.uid).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                // Atualizar dados na interface, se necessário
            } else {
                // Criar documento se não existir
                db.collection('users').doc(currentUser.uid).set({
                    name: currentUser.displayName || '',
                    email: currentUser.email,
                    createdAt: new Date().toISOString(),
                    isAdmin: ADMIN_EMAILS.includes(currentUser.email)
                });
            }
        })
        .catch(error => {
            console.error('Erro ao carregar dados do usuário:', error);
        });
}

// Carregar dados offline
function loadOfflineData() {
    // Carregar dados do localStorage
    // Implementado no app.js
}

// Verificar se o usuário atual é administrador
function isUserAdmin() {
    return isAdmin;
}

// Verificar se o usuário atual está autenticado
function isUserAuthenticated() {
    return !!currentUser;
}

// Obter ID do usuário atual
function getCurrentUserId() {
    return currentUser ? currentUser.uid : null;
}

// Obter nome do usuário atual
function getCurrentUserName() {
    if (!currentUser) return '';
    return currentUser.displayName || currentUser.email.split('@')[0];
}

// Exportar funções para uso global
window.AuthJS = {
    initAuth,
    login,
    loginWithGoogle,
    register,
    logout,
    isUserAdmin,
    isUserAuthenticated,
    getCurrentUserId,
    getCurrentUserName
};