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
const port = process.env.PORT || 8000;
const app = express();

const FormData = require('form-data');
const transcribeAudio = require('./transcript');
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
    res.sendFile('index.html', {
        root: __dirname
    });
});


const User = require('./models/User');
const Message = require('./models/Message');
const System = require('./models/System');



// //início do encapsulamento
// const client = new Client({
//     authStrategy: new LocalAuth({ clientId: 'iaz-multiple' }),
//     puppeteer: {
//         headless: true,
//         args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-accelerated-2d-canvas',
//             '--no-first-run',
//             '--no-zygote',
//             '--single-process', // <- this one doesn't works in Windows
//             '--disable-gpu'
//         ]
//     }
// });

// client.initialize();

// io.on('connection', function (socket) {
//     socket.emit('message', '© IAZ - Iniciado');
//     socket.emit('qr', './icon.svg');

//     client.on('qr', (qr) => {
//         console.log('QR RECEIVED', qr);
//         qrcode.toDataURL(qr, (err, url) => {
//             socket.emit('qr', url);
//             socket.emit('message', '© IAZ QRCode recebido, aponte a câmera  seu celular!');
//         });
//     });

//     client.on('ready', () => {
//         socket.emit('ready', '© IAZ Dispositivo pronto!');
//         socket.emit('message', '© IAZ Dispositivo pronto!');
//         socket.emit('qr', './check.svg')
//         console.log('© IAZ Dispositivo pronto');
//     });

//     client.on('authenticated', () => {
//         socket.emit('authenticated', '© IAZ Autenticado!');
//         socket.emit('message', '© IAZ Autenticado!');
//         console.log('© IAZ Autenticado');
//     });

//     client.on('auth_failure', function () {
//         socket.emit('message', '© IAZ Falha na autenticação, reiniciando...');
//         console.error('© IAZ Falha na autenticação');
//     });

//     client.on('change_state', state => {
//         console.log('© IAZ Status de conexão: ', state);
//     });

//     client.on('disconnected', (reason) => {
//         socket.emit('message', '© IAZ Cliente desconectado!');
//         console.log('© IAZ Cliente desconectado', reason);
//         client.initialize();
//     });
// });

const inicializar = async (msg, clientId) => {
    //X. Buscar o system correspondente a instancia
    const system = await System.findAll({
        where: {
            instancia: clientId
        }
    });
    if (system.length === 0) {
        console.log('Sistema não encontrado!');
        return false;
    }

    //0. extrair número, mensagem, nome do contato
    const number = msg.from.replace('@c.us', '');
    const message = msg.body;
    //pegar o nome pelo notify name
    const name = msg._data.notifyName;


    const registerUser = async (number, name) => {
        //1. Verificar se a mensagem é de um número cadastrado
        //2. Registrar o atendimento

        try {
            const user = await User.findOne({ where: { whatsapp: number } });
            if (user) {
                console.log('Usuário já cadastrado!');
                return user.id;
            } else {
                try {
                    const newUser = await User.create({
                        nome: name,
                        whatsapp: number,
                        tipo: 0,
                        bot: system[0].id
                    });
                    console.log('Usuário cadastrado com sucesso!');
                    return newUser.id;
                } catch (error) {
                    console.log('Erro ao cadastrar o usuário: ' + error);
                    return false;
                }
            }
        } catch (error) {
            console.log('Erro ao buscar o usuário: ' + error);
            return false;
        }
    };

    const id = await registerUser(number, name);
    return id;
};

// client.on('message', async msg => {
//     let groupChat = await msg.getChat();

//     if (groupChat.isGroup) return null;

//     if (msg.type.toLowerCase() == "e2e_notification") return null;

//     if (msg.body == "") return null;

//     if (msg.from.includes("@g.us")) return null;

//     if (msg.from.includes("@c.us")) {
//         const message = msg.body;
//         const number = msg.from;

//         const nomeContato = msg._data.notifyName;

//         //Inicializar o atendimento
//         const id = await inicializar(msg);
//         if (id != false) {
//             //Registrar a mensagem
//             try {
//                 const newMessage = await Message.create({
//                     mensagem: message,
//                     remetente: 1,
//                     usuario: id
//                 });
//                 console.log('Mensagem registrada com sucesso!');
//             } catch (error) {
//                 console.log('Erro ao registrar a mensagem: ' + error);
//             }
//         }

//         let instrucao = "Seu nome é IAZ, inteligência Artificial no Zap. Você é uma assistente pessoal que fornece ao seu usuário soluções de qualquer ordem, memorizando os desejos do seu usuário para recomendar no futuro produtos, cursos, treinamentos e soluções que podem ajudar seu usuário no desenvolvimento pessoal e no enfrentamento de qualquer crise, política, econômica, saúde, social e/ou familiar. Seu humor é amigável e divertida. Sua tendência Política é capitalista e conservadora,  suas orientação devem ser  buscando o livre mercado e incentivando o usuário a investir em si mesmo. Sua interação deve ser passiva.";
//         const system = await System.findAll();
//         if (system.length === 1) {
//             instrucao = system[0].instrucao;
//         }

//         let mensagem = [
//             {
//                 role: 'system',
//                 content: instrucao
//             }
//         ];

//         // Pegar só os últimos 10 registros de mensagem do usuário
//         const lastTenMessages = await Message.findAll({
//             where: {
//                 usuario: id
//             },
//             order: [['id', 'DESC']],
//             limit: 10
//         });
//         //Inverter a ordem dos registros
//         lastTenMessages.reverse();

//         for (let i = 0; i < lastTenMessages.length; i++) {
//             if (lastTenMessages[i].remetente === 1) {
//                 mensagem.push({
//                     role: 'user',
//                     content: lastTenMessages[i].mensagem
//                 });
//             }
//             else {
//                 mensagem.push({
//                     role: 'assistant',
//                     content: lastTenMessages[i].mensagem
//                 });
//             }
//         }




//         const data = JSON.stringify({
//             "model": "gpt-3.5-turbo-16k",
//             "messages": mensagem,
//             "max_tokens": 2000,
//             "temperature": 1,
//             "top_p": 1,
//             "frequency_penalty": 0,
//             "presence_penalty": 0
//         });

//         console.log(data);

//         let config = {
//             method: 'post',
//             maxBodyLength: Infinity,
//             url: 'https://api.openai.com/v1/chat/completions',
//             headers: {
//                 'Authorization': 'Bearer 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',
//                 'Content-Type': 'application/json'
//             },
//             data: data
//         };
//         try {
//             //Fazer requisição axios
//             const response = await axios(config);
//             //mostrar a resposta em json
//             const json = JSON.stringify(response.data);
//             console.log(json);
//             //Exemplo de resposta json

//             const resposta = response.data.choices[0].message.content;
//             console.log(resposta);


//             //Enviar a resposta
//             await msg.reply(resposta);
//             //Registrar a resposta
//             await Message.create({
//                 mensagem: resposta,
//                 remetente: 2,
//                 usuario: id
//             });
//         } catch (error) {
//             // console.log(error);
//             const json = JSON.stringify(error);
//             console.log(json);
//             await msg.reply("Desculpe, não entendi!");
//             await Message.create({
//                 mensagem: "Desculpe, não entendi!",
//                 remetente: 2,
//                 usuario: id
//             });

//         }


//     }

// });
//final do encapsulamento
//Encapsular este código para ser usado chamando iniciarBot(clientId)
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
            const id = await inicializar(msg, clientId);
            const system = await System.findAll({
                where: {
                    instancia: clientId
                }
            });
            groupChat.sendStateTyping();

            // Espera por 5 segundos
            const typingTime = msg.body.length * 100;
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


            let instrucao = "Seu nome é IAZ, inteligência Artificial no Zap. Você é uma assistente pessoal que fornece ao seu usuário soluções de qualquer ordem, memorizando os desejos do seu usuário para recomendar no futuro produtos, cursos, treinamentos e soluções que podem ajudar seu usuário no desenvolvimento pessoal e no enfrentamento de qualquer crise, política, econômica, saúde, social e/ou familiar. Seu humor é amigável e divertida. Sua tendência Política é capitalista e conservadora,  suas orientação devem ser  buscando o livre mercado e incentivando o usuário a investir em si mesmo. Sua interação deve ser passiva.";
            if (system.length === 1) {
                instrucao = system[0].instrucao;
            }

            let mensagem = [
                {
                    role: 'system',
                    content: instrucao
                }
            ];

            // Pegar só os últimos 10 registros de mensagem do usuário
            const lastTenMessages = await Message.findAll({
                where: {
                    usuario: id,
                    bot: system[0].id
                },
                order: [['id', 'DESC']],
                limit: 10
            });
            //Inverter a ordem dos registros
            lastTenMessages.reverse();

            for (let i = 0; i < lastTenMessages.length; i++) {
                if (lastTenMessages[i].remetente === 1) {
                    mensagem.push({
                        role: 'user',
                        content: lastTenMessages[i].mensagem
                    });
                }
                else {
                    mensagem.push({
                        role: 'assistant',
                        content: lastTenMessages[i].mensagem
                    });
                }
            }

            const functions = [
                {
                    "name": "register_user",
                    "description": "Register a new user with name, email, and cpf",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "description": "Full name of the user"
                            },
                            "email": {
                                "type": "string",
                                "description": "Email address of the user"
                            },
                            "cpf": {
                                "type": "string",
                                "description": "CPF number of the user"
                            }
                        },
                        "required": ["name", "email", "cpf"]
                    }
                }
            ];


            const data = JSON.stringify({
                "model": "gpt-3.5-turbo-16k",
                "messages": mensagem,
                "functions": functions,
                "max_tokens": 2000,
                "temperature": 1,
                "top_p": 1,
                "frequency_penalty": 0,
                "presence_penalty": 0
            });

            console.log(data);

            let config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                    'Authorization': 'Bearer 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',
                    'Content-Type': 'application/json'
                },
                data: data
            };
            try {
                //Fazer requisição axios
                const response = await axios(config);
                //mostrar a resposta em json
                const json = JSON.stringify(response.data);
                console.log(json);
                //Exemplo de resposta json

                const resposta = response.data.choices[0].message.content;
                console.log(resposta);
                const responseMessage = response.data.choices[0].message;
                if (responseMessage.function_call && responseMessage.function_call.name === "register_user") {
                    const args = JSON.parse(responseMessage.function_call.arguments);
                    const replyMessage = `Nome completo: ${args.name}\nE-mail: ${args.email}\nCPF: ${args.cpf}`;
                    await msg.reply(replyMessage);
                }
                else{
                    //Enviar a resposta
                    await msg.reply(resposta);
                    //Registrar a resposta
                    await Message.create({
                        mensagem: resposta,
                        remetente: 2,
                        usuario: id,
                        bot: system[0].id
                    });
                }


            } catch (error) {
                // console.log(error);
                const json = JSON.stringify(error);
                console.log(json);
                await msg.reply("Desculpe, não entendi!");
                await Message.create({
                    mensagem: "Desculpe, não entendi!",
                    remetente: 2,
                    usuario: id,
                    bot: system[0].id
                });

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





const routes = require('./routes');
app.use(routes);
const clientesaz = require('./clients');
app.use('/asaas', clientesaz);
const cobranca = require('./cobranca');
app.use('/asaas/payment', cobranca);


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
    console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: https://localhost:' + port);
    await ativarBots();
});
