const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const https = require('https'); // Importa o módulo https
const fs = require('fs'); // Importa o módulo file system
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const port = process.env.PORT || 4000;
const app = express();

//aiProcessor.js
const { processMessagesWithAI, registerWithAI, PaymentWithAI } = require('./functions/aiProcessor');

const FormData = require('form-data');
const transcribeAudio = require('./functions/transcript');
const path = require('path');
// Leitura das chaves SSL
const privateKey = fs.readFileSync('/etc/letsencrypt/live/mapapun.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/mapapun.com/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app); // Criação do servidor HTTPS com as credenciais
const io = socketIO(server);

const { Configuration, OpenAIApi } = require("openai");

function delay(t, v) {
    return new Promise(function (resolve) {
        setTimeout(resolve.bind(null, v), t)
    });
}

app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(fileUpload({
    debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
    res.sendFile('view/index.html', {
        root: __dirname
    });
});


const User = require('./models/User');
const Message = require('./models/Message');
const System = require('./models/System');
const Cliente = require('./models/Cliente');


const inicializar = require('./functions/inicializar');

let clients = {};
const iniciarBot = async (clientId) => {
    clients[clientId] = new Client({
        authStrategy: new LocalAuth({ clientId: clientId }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu'
            ]
        }
    });
    clients[clientId].initialize();
    io.on('connection', function (socket) {
        // Faz o socket entrar na sala específica para este clientId
        socket.join(clientId);

        io.to(clientId).emit('message', '© IAZ - Iniciado - Bot ' + clientId);
        io.to(clientId).emit('qr', './icon.svg');

        clients[clientId].on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.toDataURL(qr, (err, url) => {
                io.to(clientId).emit('qr', url);
                io.to(clientId).emit('message', '© IAZ QRCode recebido, aponte a câmera do seu celular para conectar o bot ' + clientId + '!');
            });
        });

        clients[clientId].on('ready', () => {
            io.to(clientId).emit('ready', '© IAZ Dispositivo pronto para o bot ' + clientId + '!');
            io.to(clientId).emit('message', '© IAZ Dispositivo pronto para o bot ' + clientId + '!');
            io.to(clientId).emit('qr', './check.svg');
            console.log('© IAZ Dispositivo pronto para o bot ' + clientId);
        });

        clients[clientId].on('authenticated', () => {
            io.to(clientId).emit('authenticated', '© IAZ Autenticado para o bot ' + clientId + '!');
            io.to(clientId).emit('message', '© IAZ Autenticado para o bot ' + clientId + '!');
            console.log('© IAZ Autenticado para o bot ' + clientId);
        });

        clients[clientId].on('auth_failure', function () {
            io.to(clientId).emit('message', '© IAZ Falha na autenticação, reiniciando o bot ' + clientId + '...');
            console.error('© IAZ Falha na autenticação do bot ' + clientId);
        });

        clients[clientId].on('change_state', state => {
            console.log('© IAZ Status de conexão do bot ' + clientId + ': ', state);
        });

        clients[clientId].on('disconnected', (reason) => {
            io.to(clientId).emit('message', '© IAZ Cliente desconectado do bot ' + clientId + '!');
            console.log('© IAZ Cliente desconectado do bot ' + clientId, reason);
            clients[clientId].initialize();
        });
    });


    clients[clientId].on('message', async msg => {
        console.log('Numero: ' + msg.from);
        let groupChat = await msg.getChat();

        if (groupChat.isGroup) return null;

        if (msg.type.toLowerCase() == "e2e_notification") return null;

        if (msg.body == "" && !msg.hasMedia) return null;

        if (msg.from.includes("@g.us")) return null;

        if (msg.from.includes("@c.us")) {
            let message = msg.body;
            const number = msg.from;
            if (msg.hasMedia && msg.type === 'ptt') {
                console.log('Mensagem de áudio recebida!');

                try {
                    const media = await msg.downloadMedia();

                    // Defina o caminho onde você deseja salvar o áudio
                    const filePath = path.join(__dirname, 'audios', `${msg.id.id}.ogg`);

                    // Escreva o conteúdo do áudio no arquivo
                    await fs.writeFileSync(filePath, media.data, { encoding: 'base64' });
                    console.log(`Áudio salvo em ${filePath}`);

                    const transcription = await transcribeAudio(filePath);
                    console.log('Transcrição:', transcription);
                    await msg.reply('Transcrição: ' + transcription);
                    message = transcription;
                } catch (error) {
                    console.log('Não conseguiu transcrever: ' + error);
                    await msg.reply('Erro: ' + error);
                }
            }
            const nomeContato = msg._data.notifyName;

            //Inicializar o atendimento
            // considerando que a resposta vêm assim: {id: 1, idCliente: null}
            const id = await inicializar(msg, clientId);

            const system = await System.findAll({
                where: {
                    instancia: clientId
                }
            });
            groupChat.sendStateTyping();

            // Espera por alguns segundos para simular o tempo de digitação
            let typingTime = msg.body.length * 100;
            if (typingTime > 3000) {
                typingTime = 3000;
            }
            await new Promise(resolve => setTimeout(resolve, typingTime));

            if (id != false) {
                //Registrar a mensagem
                try {
                    const newMessage = await Message.create({
                        mensagem: message,
                        remetente: 1,
                        usuario: id,
                        bot: system[0].id
                    });
                    console.log('Mensagem registrada com sucesso!');
                } catch (error) {
                    console.log('Erro ao registrar a mensagem: ' + error);
                }
            }


            let instrucao = "Você deve apenas tentar identificar da melhor forma possível qual função o cliente está chamando.";
            if (system.length === 1) {
                instrucao = system[0].instrucao;
            }

            console.log('Cliente já cadastrado!');
            //Enviar a mensagem para o usuário
            try {
                console.log('Usuário tem permissão!');

                const response = await processWithFunctions(id, instrucao, system);

                console.log('Resposta do bot: ' + response);
                await msg.reply(response);
                //Registrar a resposta
                await Message.create({
                    mensagem: response,
                    remetente: 2,
                    usuario: id,
                    bot: system[0].id
                });
            } catch (error) {
                console.log('Erro ao enviar a mensagem: ' + error);
                await msg.reply('Erro ao enviar a mensagem: ' + error);
            }
        }
    });
};


app.post('/instrucao', async (req, res) => {
    const { instruction, novo, nome, id } = req.body;
    // if new = true, criar uma nova system com a instrucao
    if (novo) {
        try {
            const system = await System.create({
                instancia: nome,
                instrucao: instruction
            });
            iniciarBot(nome);
            res.status(200).json({
                status: true,
                message: 'Instrução criada com sucesso!',
                system: system
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erro ao criar a instrução: ' + error
            });
        }
    }
    // if novo = false, atualizar a instrucao
    else {
        try {
            const system = await System.update({
                instrucao: instruction
            }, {
                where: {
                    id: id
                }
            });
            //apagar as mensagens do banco de dados
            const messages = await Message.destroy({
                where: {
                    bot: id
                }
            });

            res.status(200).json({
                status: true,
                message: 'Instrução atualizada com sucesso!',
                system: system
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erro ao atualizar a instrução: ' + error
            });
        }
    }
});
// Criar uma rota que para o bot correspondente e apaga o bot (system) 
app.delete('/bots/:id', async (req, res) => {
    //Buscar todos os bots
    try {
        const id = req.params.id;
        // Parar a instancia do bot
        const system = await System.findAll({
            where: {
                id: id
            }
        });
        const instancia = system[0].instancia;
        clients[instancia].destroy();
        //Destruir o registro do bot
        const messages = await Message.destroy({
            where: {
                bot: id
            }
        });
        const users = await User.destroy({
            where: {
                bot: id
            }
        });
        const systems = await System.destroy({
            where: {
                id: id
            }
        });

        res.status(200).json({
            status: true,
            message: 'Bot apagado com sucesso!',
            systems: systems
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao apagar o bot: ' + error
        });
    }
});





const routes = require('./routes/routes');
const webhook = require('./routes/webhook');
const verificaPermissao = require('./functions/verificaPermissao');
app.use(routes);
app.use(webhook);


async function sendMessage(clientId, number, message) {
    const client = clients[clientId];
    if (!client) {
        throw new Error('Cliente não encontrado');
    }
    const numberId = number + '@c.us';  // Formate o número corretamente.
    await client.sendMessage(numberId, message);
}

// Você pode adicionar isso no final do seu arquivo principal ou em um arquivo de rotas separado.
app.post('/send-message', async (req, res) => {
    const { clientId, number, message } = req.body;
    console.log({ clientId, number, message });
    try {
        await sendMessage(clientId, number, message);
        res.status(200).send('Mensagem enviada com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar mensagem:', error.message);
        res.status(200).send('Erro ao enviar mensagem: ' + error.message);
    }
});



const ativarBots = async () => {
    try {
        // Buscar todas as instâncias de System
        const systems = await System.findAll();

        // Iniciar um bot para cada instância de System
        for (const system of systems) {
            const clientId = system.instancia;
            await iniciarBot(clientId);
            console.log(`Bot iniciado para a instância ${clientId}`);
        }
    } catch (error) {
        console.error('Erro ao ativar os bots:', error);
    }
};

server.listen(port, async function () {
    // Chamar a função para ativar todos os bots
    console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: https://mapapun.com:' + port);
    await ativarBots();
});