const express = require('express'); // Importa o framework Express para criar o servidor web
const mysql = require('mysql2');  // Importa a biblioteca para conexão com o MySQL
const bodyParser = require('body-parser'); // Middleware para processar dados do corpo da requisição
const cors = require('cors'); // Middleware para permitir requisições de diferentes origens (CORS)
const bcrypt = require('bcrypt'); // Biblioteca para criptografar senhas
const jwt = require('jsonwebtoken'); // Biblioteca para criar e verificar tokens JWT (autenticação)
const multer = require('multer'); // Middleware para upload de arquivos
const path = require('path'); // Módulo nativo do Node.js para manipulação de caminhos de arquivos
const fs = require('fs'); // Módulo nativo do Node.js para manipulação de arquivos e diretórios
const nodemailer = require('nodemailer'); // Biblioteca para envio de e-mails
require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

console.log("JWT_SECRET:", process.env.JWT_SECRET);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
console.log('Servindo arquivos estáticos de:', path.join(__dirname, 'fastdoc-documentos'));

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Conexão com o banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'fastdoc',
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado ao banco de dados.');
});

// Criar a pasta 'uploads' se ela não existir
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Configuração do armazenamento de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${file.originalname}`;
        cb(null, uniqueSuffix);
    },
});

// Configuração do upload com validações
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5 MB
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos JPEG, PNG ou PDF são permitidos.'));
        }
    },
});

// Criação do transportador para o envio de e-mails
const transporter = nodemailer.createTransport({
    service: 'gmail', // Ou outro serviço que você esteja usando
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware para autenticação com JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega o token após 'Bearer'

    if (!token) {
        return res.status(401).json({ message: 'Token não fornecido.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }

        req.user = user; // Salva o usuário no objeto da requisição
        next(); // Chama o próximo middleware
    });
};

// Rota para enviar dúvidas por e-mail
app.post('/send-question', (req, res) => {
    const { name, email, phone, message } = req.body;

    // Verificar se todos os campos obrigatórios estão presentes
    if (!name || !email || !message) {
        return res.status(400).json({ message: 'Por favor, preencha todos os campos obrigatórios.' });
    }

    // Configuração do e-mail
    const mailOptions = {
        from: process.env.EMAIL_USER,  // E-mail do remetente
        to: process.env.EMAIL_USER,    // E-mail do destinatário (geralmente você)
        subject: 'Nova dúvida do formulário de contato',
        text: `Nome: ${name}\nE-mail: ${email}\nTelefone: ${phone || 'Não informado'}\nMensagem:\n${message}`,
        html: `
            <h3>Nova dúvida do formulário de contato</h3>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${message}</p>
        `
    };

    // Enviar o e-mail usando o Nodemailer
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Erro ao enviar o e-mail:', err);
            return res.status(500).json({ message: 'Erro ao enviar a dúvida.', error: err.message });
        }

        console.log('E-mail enviado com sucesso:', info.response);
        res.status(200).json({ message: 'Sua dúvida foi enviada com sucesso!' });
    });
});


// Rota de registro
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, hashedPassword], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: 'Email já registrado.' });
            }
            return res.status(500).json({ message: 'Bem Vindo ao FastDoc.' });
        }
        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    });
});

// Rota de login
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    console.log('Dados recebidos no backend:', { email, password }); // Log dos dados recebidos

    // Verificação se os campos 'email' e 'password' estão preenchidos
    if (!email || !password) {
        console.log('Campos não preenchidos'); // Log de campos não preenchidos
        return res.status(400).json({ message: 'Bem Vindo.' });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.log('Erro no servidor:', err); // Log de erro no servidor
            return res.status(500).json({ message: 'Erro no servidor.' });
        }

        if (results.length === 0) {
            console.log('Credenciais inválidas: usuário não encontrado'); // Log de usuário não encontrado
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            console.log('Credenciais inválidas: senha incorreta'); // Log de senha incorreta
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Criação do token JWT
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        console.log('Login realizado com sucesso'); // Log de login bem-sucedido
        // Retornar a mensagem de sucesso após autenticação e gerar o token
        return res.status(200).json({ message: 'Login realizado com sucesso!', token });
    });
});

// Rota para validar o token
app.get('/validate-token', authenticateToken, (req, res) => {
    res.status(200).json({ message: 'Token válido.' });
});

// Rota para upload de documentos, com base no tipo de documento
app.post('/upload-doc/:type', authenticateToken, upload.single('file'), (req, res) => {
    const { type } = req.params;
    const validTypes = ['personal', 'dependent', 'vehicle', 'house'];

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const filePath = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    res.status(200).json({
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} document uploaded successfully!`,
        fileUrl: filePath,
    });
});

// Rota para listar documentos com base no tipo
app.get('/list-docs/:type', authenticateToken, (req, res) => {
    const { type } = req.params;
    const validTypes = ['personal', 'dependent', 'vehicle', 'house'];

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo de documento inválido.' });
    }

    const directoryPath = path.join(__dirname, 'uploads');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao listar arquivos.' });
        }

        const filteredFiles = files.filter(file => file.startsWith(type));
        res.status(200).json({ files: filteredFiles });
    });
});

// Etapa 1: Esqueci minha senha
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    // Verificar se o e-mail foi fornecido
    if (!email) {
        return res.status(400).json({ message: 'O campo de e-mail é obrigatório.' });
    }

    // Verificação no banco de dados para garantir que o e-mail exista
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Erro no banco de dados:', err);
            return res.status(500).json({ message: 'Erro no servidor.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'E-mail não encontrado.' });
        }

        // Gerar token JWT para o link de redefinição
        const token = jwt.sign(
            { email: results[0].email }, // Payload com o e-mail do usuário
            process.env.JWT_SECRET,      // Segredo do JWT
            { expiresIn: '1h' }          // Token expira em 1 hora
        );

        // Configuração do link de redefinição de senha
        const resetLink = `http://localhost:3000/reset-password?token=${token}`;

        // Configuração do e-mail
        const mailOptions = {
            from: process.env.EMAIL_USER,  // E-mail do remetente (configurado no .env)
            to: email,                     // E-mail do destinatário
            subject: 'Redefinição de Senha - FastDoc',
            text: `Olá! Para redefinir sua senha, clique no link abaixo:\n\n${resetLink}\n\nO link é válido por 1 hora.`,
            html: `
                <h2>Redefinição de Senha</h2>
                <p>Olá!</p>
                <p>Para redefinir sua senha, clique no link abaixo:</p>
                <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
                <p>O link é válido por <strong>1 hora</strong>.</p>
                <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
            `
        };

        // Enviar o e-mail usando o Nodemailer
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error('Erro ao enviar o e-mail:', err);
                return res.status(500).json({ message: 'Erro ao enviar o e-mail.', error: err.message });
            }

            console.log('E-mail enviado com sucesso:', info.response);
            res.status(200).json({ message: 'Instruções enviadas para o e-mail.' });
        });
    });
});

// Etapa 2: Redefinição de senha
app.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    // Verificar o token JWT
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(400).json({ message: 'Token inválido ou expirado.' });

        const email = decoded.email;
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Atualizar a senha no banco de dados
        const query = 'UPDATE users SET password = ? WHERE email = ?';
        db.query(query, [hashedPassword, email], (err, results) => {
            if (err) return res.status(500).json({ message: 'Erro no servidor.' });

            if (results.affectedRows === 0) {
                return res.status(404).json({ message: 'Email não encontrado.' });
            }

            res.status(200).json({ message: 'Senha redefinida com sucesso!' });
        });
    });
});

// Middleware para servir arquivos estáticos da pasta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Servindo os arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, '../fastdoc-documentos')));

app.get('/reset-password', (req, res) => {
    res.sendFile('C:/Users/Lenovo/Desktop/fastdoc31/fastdoc-documentos/reset-password.html');
});

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
