// Manipulação do formulário de cadastro
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Previne o comportamento padrão de envio do formulário

    // Coleta os dados do formulário de cadastro
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log('Dados de cadastro:', { name, email, password }); // Log dos dados de cadastro

    // Envia os dados para o servidor backend
    const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // Informando que os dados são JSON
        },
        body: JSON.stringify({ name, email, password }) // Envia os dados do formulário como JSON
    });

    // Espera a resposta do backend
    const data = await response.json();

    console.log('Resposta do backend (cadastro):', data); // Log da resposta do backend

    // Exibe a mensagem de sucesso ou erro
    if (response.ok) {
        alert(data.message); // Se o cadastro for bem-sucedido
    } else {
        alert(data.error || 'Erro ao realizar cadastro.'); // Se houver erro
    }
});

// Alternância entre as telas de login e cadastro
const container = document.getElementById('container');
document.getElementById('register').addEventListener('click', () => container.classList.add('active'));
document.getElementById('login').addEventListener('click', () => container.classList.remove('active'));

// Manipulação do formulário de login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Previne o recarregamento da página

    const email = document.querySelector('input[name="email"]').value;
    const password = document.querySelector('input[name="password"]').value;

    console.log('Dados de login:', { email, password }); // Log dos dados de login

    // Verifica se ambos os campos foram preenchidos
    if (!email || !password) {
        return alert('Bem Vindo.');
    }

    // Envia os dados de login para o backend
    const response = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    console.log('Resposta do backend (login):', data); // Log da resposta do backend

    // Verifica o status HTTP da resposta
    if (response.status === 200 && data.token) {
        // Salva o token no localStorage
        localStorage.setItem('token', data.token);

        // Redireciona para a página protegida
        window.location.href = 'documentos_pessoais.html';
    } else {
        alert(data.message || 'Erro ao realizar login.');
    }
});

// Verifica se o token é válido
async function checkSession() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = 'index.html';
        return false;
    }

    // Valida o token no backend
    const response = await fetch('http://localhost:3000/meus-documentos', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        localStorage.removeItem('token'); // Remove o token inválido
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = 'index.html';
        return false;
    }

    return true;
}

// Verifica a sessão na página protegida
if (window.location.pathname === '/documentos_pessoais.html') {
    checkSession();
}

// Upload de documentos
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Sua sessão expirou. Faça login novamente.');
        window.location.href = 'index.html';
        return;
    }

    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (!file) {
        return alert('Selecione um arquivo para upload.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:3000/upload/${category}', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });

    const data = await response.json();

    console.log('Resposta do backend (upload):', data); // Log da resposta do backend

    if (response.ok) {
        alert(data.message);
    } else {
        alert(data.message || 'Erro ao fazer upload do documento.');
    }
});
