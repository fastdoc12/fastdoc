const API_URL = 'http://localhost:3000'; // URL da API

// Função para validar o token
async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Usuário não identificado. Faça login novamente.');
        window.location.href = 'index.html';
        return false;
    }

    try {
        const response = await fetch(`${API_URL}/validate-token`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Token inválido ou expirado');

        console.log('Token válido');
        return true;
    } catch (error) {
        console.error(error.message);
        alert('Sua sessão expirou. Faça login novamente.');
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return false;
    }
}

// Função para enviar documentos
async function uploadDocument(endpoint, fileInputId, storageKey) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Erro de autenticação. Faça login novamente.');
        window.location.href = 'index.html';
        return;
    }

    const fileInput = document.getElementById(fileInputId);
    const file = fileInput.files[0];

    if (!file) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        alert('Por favor, selecione um arquivo válido (JPEG, PNG ou PDF).');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message || 'Documento enviado com sucesso!');
            const documentoUrl = result.fileUrl || URL.createObjectURL(file);
            localStorage.setItem(storageKey, documentoUrl); // Armazena a URL no localStorage
            carregarDocumentoSalvo(storageKey); // Exibe o documento após o upload
        } else {
            alert(`Erro: ${result.error || 'Erro ao enviar o documento.'}`);
        }
    } catch (error) {
        console.error('Erro no upload:', error);
        alert('Erro ao enviar o documento. Tente novamente.');
    }
}

// Função para carregar o documento salvo
function carregarDocumentoSalvo(storageKey) {
    const documento = localStorage.getItem(storageKey);
    const container = document.getElementById('imagem-documento');
    container.innerHTML = ''; // Limpa o conteúdo anterior

    if (documento) {
        const ext = documento.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png'].includes(ext)) {
            const img = document.createElement('img');
            img.src = documento;
            img.alt = 'Documento';
            container.appendChild(img);
        } else if (ext === 'pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = documento;
            iframe.width = '100%';
            iframe.height = '600';
            container.appendChild(iframe);
        } else {
            container.innerHTML = 'Tipo de arquivo não suportado.';
        }
    } else {
        container.innerHTML = '<p>Nenhum documento carregado ainda.</p>';
    }
}
