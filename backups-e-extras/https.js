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




const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
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

client.initialize();

io.on('connection', function (socket) {
    socket.emit('message', '© BOT-ZDG - Iniciado');
    socket.emit('qr', './icon.svg');

    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', '© BOT-ZDG QRCode recebido, aponte a câmera  seu celular!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', '© BOT-ZDG Dispositivo pronto!');
        socket.emit('message', '© BOT-ZDG Dispositivo pronto!');
        socket.emit('qr', './check.svg')
        console.log('© BOT-ZDG Dispositivo pronto');
    });

    client.on('authenticated', () => {
        socket.emit('authenticated', '© BOT-ZDG Autenticado!');
        socket.emit('message', '© BOT-ZDG Autenticado!');
        console.log('© BOT-ZDG Autenticado');
    });

    client.on('auth_failure', function () {
        socket.emit('message', '© BOT-ZDG Falha na autenticação, reiniciando...');
        console.error('© BOT-ZDG Falha na autenticação');
    });

    client.on('change_state', state => {
        console.log('© BOT-ZDG Status de conexão: ', state);
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', '© BOT-ZDG Cliente desconectado!');
        console.log('© BOT-ZDG Cliente desconectado', reason);
        client.initialize();
    });
});

// Send message
app.post('/zdg-message', [
    body('number').notEmpty(),
    body('message').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req).formatWith(({
        msg
    }) => {
        return msg;
    });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = req.body.number;
    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);
    const message = req.body.message;

    if (numberDDI !== "55") {
        const numberZDG = number + "@c.us";
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Mensagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Mensagem não enviada',
                response: err.text
            });
        });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
        const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Mensagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Mensagem não enviada',
                response: err.text
            });
        });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
        const numberZDG = "55" + numberDDD + numberUser + "@c.us";
        client.sendMessage(numberZDG, message).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Mensagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Mensagem não enviada',
                response: err.text
            });
        });
    }
});


// Send media
app.post('/zdg-media', [
    body('number').notEmpty(),
    body('caption').notEmpty(),
    body('file').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req).formatWith(({
        msg
    }) => {
        return msg;
    });

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }

    const number = req.body.number;
    const numberDDI = number.substr(0, 2);
    const numberDDD = number.substr(2, 2);
    const numberUser = number.substr(-8, 8);
    const caption = req.body.caption;
    const fileUrl = req.body.file;

    let mimetype;
    const attachment = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
    }).then(response => {
        mimetype = response.headers['content-type'];
        return response.data.toString('base64');
    });

    const media = new MessageMedia(mimetype, attachment, 'Media');

    if (numberDDI !== "55") {
        const numberZDG = number + "@c.us";
        client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Imagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Imagem não enviada',
                response: err.text
            });
        });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
        const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
        client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Imagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Imagem não enviada',
                response: err.text
            });
        });
    }
    else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
        const numberZDG = "55" + numberDDD + numberUser + "@c.us";
        client.sendMessage(numberZDG, media, { caption: caption }).then(response => {
            res.status(200).json({
                status: true,
                message: 'BOT-ZDG Imagem enviada',
                response: response
            });
        }).catch(err => {
            res.status(500).json({
                status: false,
                message: 'BOT-ZDG Imagem não enviada',
                response: err.text
            });
        });
    }
});


const messages = {};


const inicializar = async (msg) => {
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

client.on('message', async msg => {
    let groupChat = await msg.getChat();

    if (groupChat.isGroup) return null;

    if (msg.type.toLowerCase() == "e2e_notification") return null;

    if (msg.body == "") return null;

    if (msg.from.includes("@g.us")) return null;

    if (msg.from.includes("@c.us")) {
        const message = msg.body;
        const number = msg.from;
        //Registrar a mensagem
        if (messages[number] === undefined) {
            messages[number] = [];
        }
        messages[number].push({ tipo: 1, mensagem: message });
        const nomeContato = msg._data.notifyName;

        //Inicializar o atendimento
        const id = await inicializar(msg);
        if (id != false){
            //Registrar a mensagem
            try {
                const newMessage = await Message.create({
                    mensagem: message,
                    remetente: 1,
                    usuario: id
                });
                console.log('Mensagem registrada com sucesso!');
            } catch (error) {
                console.log('Erro ao registrar a mensagem: ' + error);
            }
        }

        // const configuration = new Configuration({
        //   apiKey: "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",
        // });
        // const openai = new OpenAIApi(configuration);
        // const openai = new OpenAIApi({
        //   apiKey: "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"
        // });
        let instrucao = "Seu nome é IAZ, inteligência Artificial no Zap. Você é uma assistente pessoal que fornece ao seu usuário soluções de qualquer ordem, memorizando os desejos do seu usuário para recomendar no futuro produtos, cursos, treinamentos e soluções que podem ajudar seu usuário no desenvolvimento pessoal e no enfrentamento de qualquer crise, política, econômica, saúde, social e/ou familiar. Seu humor é amigável e divertida. Sua tendência Política é capitalista e conservadora,  suas orientação devem ser  buscando o livre mercado e incentivando o usuário a investir em si mesmo. Sua interação deve ser passiva.";
        const system = await System.findAll();
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
                usuario: id
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




        // let lastTenMessages = messages[number].slice(-10);

        // for (let i = 0; i < lastTenMessages.length; i++) {
        //     if (lastTenMessages[i].tipo === 1) {
        //         mensagem.push({
        //             role: 'user',
        //             content: lastTenMessages[i].mensagem
        //         });
        //     }
        //     else {
        //         mensagem.push({
        //             role: 'assistant',
        //             content: lastTenMessages[i].mensagem
        //         });
        //     }
        // }




        const data = JSON.stringify({
            "model": "gpt-3.5-turbo-16k",
            "messages": mensagem,
            "max_tokens": 1000,
            "temperature": 1,
            "top_p": 1,
            "frequency_penalty": 0,
            "presence_penalty": 0
        });

        console.log(data);

        // {
        //   "model": "gpt-3.5-turbo-16k",
        //   "messages": [
        //     {
        //       "role": "user",
        //       "content": ""
        //     }
        //   ],
        //   "temperature": 1.5,
        //   "max_tokens": 256,
        // }

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
            // {"id":"chatcmpl-7ovAhEjr8HrLtA5DwNZFR0DJYWHq6","object":"chat.completion","created":1692370523,"model":"gpt-3.5-turbo-16k-0613","choices":[{"index":0,"message":{"role":"assistant","content":"Olá! Sou a assistente pessoal IAZ, estou aqui para te ajudar no que precisar. O que posso fazer por você hoje?"},"finish_reason":"stop"}],"usage":{"prompt_tokens":165,"completion_tokens":33,"total_tokens":198}}

            const resposta = response.data.choices[0].message.content;
            console.log(resposta);


            //Enviar a resposta
            await msg.reply(resposta);
            //Registrar a resposta
            await Message.create({
                mensagem: resposta,
                remetente: 2,
                usuario: id
            });
            messages[number].push({ tipo: 2, mensagem: resposta });
        } catch (error) {
            // console.log(error);
            const json = JSON.stringify(error);
            console.log(json);
            await msg.reply("Desculpe, não entendi!");
            await Message.create({
                mensagem: "Desculpe, não entendi!",
                remetente: 2,
                usuario: id
            });

            messages[number].push({ tipo: 2, mensagem: "Desculpe, não entendi!" });
        }
        // const response = await openai.createChatCompletion({
        //   model: "gpt-3.5-turbo-16k",
        //   prompt: mensagem,
        //   maxTokens: 1.5,
        //   temperature: 16009,
        //   topP: 1,
        //   frequencyPenalty: 0,
        //   presencePenalty: 0
        // });


    }

});


//Criar uma rota que recebe uma instrucao
app.post('/instrucao', async (req, res) => {
    //Pegar a instrucao do corpo da requisicao
    const instrucao = req.body.instruction;
    //Verificar se existe uma instrucao no banco de dados
    const system = await System.findAll();
    if (system.length === 1) {
        //Se existir, atualizar a instrucao
        try {
            await System.update({
                instrucao: instrucao
            }, {
                where: {
                    id: system[0].id
                }
            });
            res.status(200).json({
                status: true,
                message: 'Instrução atualizada com sucesso!'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erro ao atualizar a instrução: ' + error
            });
        }
    }
    else {
        //Se não existir, criar a instrucao
        try {
            await System.create({
                instrucao: instrucao
            });
            res.status(200).json({
                status: true,
                message: 'Instrução criada com sucesso!'
            });
        } catch (error) {
            res.status(500).json({
                status: false,
                message: 'Erro ao criar a instrução: ' + error
            });
        }
    }
});

//Criar uma rota que enviará a instrucao
app.get('/instrucao', async (req, res) => {
    //Verificar se existe uma instrucao no banco de dados
    const system = await System.findAll();
    if (system.length === 1) {
        //Se existir, enviar a instrucao
        res.status(200).json({
            status: true,
            message: 'Instrução enviada com sucesso!',
            instruction: system[0].instrucao
        });
    }
    else {
        //Se não existir, enviar uma mensagem de erro
        res.status(200).json({
            status: true,
            message: 'Instrução não encontrada!',
            instruction: 'Adicione a instrução aqui'
        });
    }
});

//Criar uma rota que busca todos os usuários
app.get('/usuarios', async (req, res) => {
    //Buscar todos os usuários
    try {
        const users = await User.findAll();
        res.status(200).json({
            status: true,
            message: 'Usuários encontrados com sucesso!',
            users: users
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao buscar os usuários: ' + error
        });
    }
});






server.listen(port, function () {
    console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: https://localhost:' + port);
});
