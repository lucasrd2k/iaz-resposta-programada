// aiProcessor.js

// Importações necessárias
const axios = require('axios');
require('dotenv').config();
const { API_KEY_IA, ASAAS_API_KEY } = process.env;
const Message = require('../models/Message');
const Cliente = require('../models/Cliente');
const Function = require('../models/Function');


async function processMessagesWithAI(id, instrucao, system) {

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

    const data = JSON.stringify({
        "model": "gpt-3.5-turbo-16k",
        "messages": mensagem,
        "max_tokens": 2000,
        "temperature": 1,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${API_KEY_IA}`,
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios(config);
        const resposta = response.data.choices[0].message.content;
        return resposta;
    } catch (error) {
        console.error(error);
        return "Desculpe, não entendi!";
    }
}

async function registerWithAI(id, whatsapp, system) {
    let instrucao = "Você é o IAZ, um serviço de inteligência artificial no zap (por isso IAZ). Você deve registrar o usuário para que ele possa obter respostas, para isso, solicite o nome completo (não aceite menos que um nome e um sobrenome) e o CPF do usuário (Este, deve conter 11 dígitos, o usuário pode enviar com pontuação, mas você deve formatar para números), seja gentil nas colocações e faça apenas o seu objetivo (cadastrar o usuário), sempre direcione o usuário para se cadastrar, não responda nada até que o mesmo te envie as informações.";

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
        else if (lastTenMessages[i].remetente === 2) {
            mensagem.push({
                role: 'assistant',
                content: lastTenMessages[i].mensagem
            });
        }
        else {
            mensagem.push({
                role: 'system',
                content: lastTenMessages[i].mensagem
            });
        }
    }

    const functions = [
        {
            "name": "register_user",
            "description": "Register a new user with full name and cpf",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Full name of the user, dont accept unique names"
                    },
                    "cpf": {
                        "type": "string",
                        "description": "CPF number of the user, format to: 00000000000"
                    }
                },
                "required": ["name", "cpf"]
            },
        }
    ];

    const data = JSON.stringify({
        "model": "gpt-3.5-turbo-16k",
        "messages": mensagem,
        "functions": functions,
        "function_call": "auto",
        "max_tokens": 2000,
        "temperature": 1,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${API_KEY_IA}`,
            'Content-Type': 'application/json'
        },
        data: data
    };

    try {
        const response = await axios(config);
        const resposta = response.data.choices[0].message.content;
        const responseMessage = response.data.choices[0].message;

        if (responseMessage.function_call && responseMessage.function_call.name === "register_user") {
            const args = JSON.parse(responseMessage.function_call.arguments);
            const nome = args.name;
            const cpf = args.cpf;
            const clienteAsaas = {
                name: nome,
                cpfCnpj: cpf,
                mobilePhone: whatsapp,
            };

            //Cadastrar cliente no Asaas usando o endpoint https://api.asaas.com/v3/customers
            const config = {
                headers: {
                    'access_token': ASAAS_API_KEY,
                    'Content-Type': 'application/json'
                }
            };

            const response = await axios.post('https://api.asaas.com/v3/customers', clienteAsaas, config);

            if (response.data.errors) {
                return `Desculpe, não foi possível cadastrar o usuário no asaas. ${response.data.errors[0].description}`;
            }

            if (response.status !== 200) {
                return `Desculpe, não foi possível cadastrar o usuário no asaas. ${response.statusText}`;
            }

            const cliente = await Cliente.create({
                nome: nome,
                cpf: cpf,
                mobilePhone: whatsapp,
                id_asaas: response.data.id,
                usuario: id
            });

            if (!cliente) {
                return "Desculpe, não foi possível cadastrar o usuário no banco de dados.";
            }

            //Apagar as mensagens do usuário
            await Message.destroy({
                where: {
                    usuario: id
                }
            });

            return `Seu usuário foi cadastrado com sucesso! Você tem direito à 3 mensagens por dia no seu plano atual e pagando a assinatura você pode enviar mensagens ilimitadas. O histórico foi zerado para evitar erros no entendimento da inteligência artificial.`;
        } else {
            return resposta;
        }
    } catch (error) {
        console.error(error);
        return "Desculpe, não entendi!";
    }
}

async function PaymentWithAI(id, system) {
    // Essa função deve ser chamada quando o usuário tentar enviar uma mensagem e não tiver permissão
    // O usuário deve ser informado que ele não tem permissão e que ele precisa pagar uma assinatura para ter acesso
    // A idéia é a mesma do registerWithAI, mas com uma function diferente, que é chamada quando o usuário concorda em fazer o pagamento
    // A instrução deve ser para não responder as perguntas e orientar o usuário para fazer o pagamento, informando que o código é enviado por pix pelo whatsapp
    // O pagamento é reconhecido instantaneamente, então, quando o usuário efetuar o pagamento, o bot será liberado para responder as perguntas
    let instrucao = "Você não deve responder nada, sua licença ainda não foi paga ou está vencida, solicite o pagamento da assinatura, informando que o código é enviado por pix pelo whatsapp. Não responda as perguntas do usuário até que ele concorde em pagar a assinatura, chamando então a função programada. Se o payload do qrcode já tiver sido enviado, chame a função apenas se o usuário solicitar novamente, do contrário, peça para que o usuário aguarde a comprovação do pagamento via webhook, informando que o mesmo é reconhecido alguns minutos após o pagamento. Faça apenas a cobrança da assinatura, não responda questionamentos.";

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
        else if (lastTenMessages[i].remetente === 2) {
            mensagem.push({
                role: 'assistant',
                content: lastTenMessages[i].mensagem
            });
        }
        else {
            mensagem.push({
                role: 'system',
                content: lastTenMessages[i].mensagem
            });
        }
    }

    const functions = [
        {
            "name": "receive_pix_key",
            "description": "O sistema envia uma requisição pro asaas e retorna o qrcode pro cliente pagar",
            "parameters": {
                "type": "object",
                "properties": {
                    "confirmation": {
                        "type": "string",
                        "description": "Palavra onde o usuário confirma a intenção de realizar o pagamento, não invente isto, fale com o cliente e obtenha uma confirmação de que ele deseja receber o código pix e fazer o pagamento."
                    }
                },
                "required": ["confirmation"]
            },

        }
    ];

    const data = JSON.stringify({
        "model": "gpt-3.5-turbo-16k",
        "messages": mensagem,
        "functions": functions,
        "function_call": "auto",
        "max_tokens": 2000,
        "temperature": 1,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${API_KEY_IA}`,
            'Content-Type': 'application/json'
        },
        data: data
    };


    try {
        const response = await axios(config);
        const resposta = response.data.choices[0].message.content;
        const responseMessage = response.data.choices[0].message;

        if (responseMessage.function_call && responseMessage.function_call.name === "receive_pix_key") {
            const args = JSON.parse(responseMessage.function_call.arguments);
            console.log(args);


            //Cadastrar cliente no Asaas usando o endpoint https://api.asaas.com/v3/customers
            const config = {
                headers: {
                    'access_token': ASAAS_API_KEY,
                    'Content-Type': 'application/json'
                }
            };

            // Buscar cliente pelo id do usuário
            const cliente = await Cliente.findOne({
                where: {
                    usuario: id
                }
            });

            //     {
            //         "customer": "cus_000066449095",
            //         "billingType": "PIX",
            //         "value": 5.00,
            //         "dueDate": "2023-10-19"
            //   }
            const dueDate = new Date(); // Data de hoje no fonto yyyy-mm-dd
            const payment = {
                customer: cliente.id_asaas,
                billingType: "PIX",
                value: 5.00,
                dueDate: `${dueDate.getFullYear()}-${dueDate.getMonth() + 1}-${dueDate.getDate()}`
            };

            const response = await axios.post('https://api.asaas.com/v3/payments', payment, config);


            if (response.data.errors) {
                return `Desculpe, não foi possível gerar o pagamento no asaas. ${response.data.errors[0].description}`;
            }

            if (response.status !== 200) {
                return `Desculpe, não foi possível gerar o pagamento no asaas. ${response.statusText}`;
            }

            // Se chegou aqui, o pagamento foi gerado com sucesso
            // https://api.asaas.com/v3/payments/pay_3917981380421881/pixQrCode
            const paymentId = response.data.id;

            const responsePix = await axios.post(`https://api.asaas.com/v3/payments/${paymentId}/pixQrCode`, {}, config);

            if (responsePix.data.errors) {
                return `Desculpe, não foi possível gerar o código pix no asaas. ${responsePix.data.errors[0].description}`;
            }

            if (responsePix.status !== 200 || !responsePix.data.success) {
                return `Desculpe, não foi possível gerar o código pix no asaas. ${responsePix.statusText}`;
            }

            const payload = responsePix.data.payload;

            return `O código pix é o seguinte: \n${payload} \n\nO pagamento será reconhecido automaticamente alguns minutos após o pagamento.\nEsse código é válido até às 23:59 do dia de hoje.\n\nTe enviarei uma mensagem quando o pagamento for reconhecido.`;
        } else {
            return resposta;
        }
    } catch (error) {
        console.error(error);
        return "Desculpe, não entendi!";
    }
}


async function processWithFunctions(id, system) {
    // Essa função deve ser chamada quando o usuário tentar enviar uma mensagem e não tiver permissão
    // O usuário deve ser informado que ele não tem permissão e que ele precisa pagar uma assinatura para ter acesso
    // A idéia é a mesma do registerWithAI, mas com uma function diferente, que é chamada quando o usuário concorda em fazer o pagamento
    // A instrução deve ser para não responder as perguntas e orientar o usuário para fazer o pagamento, informando que o código é enviado por pix pelo whatsapp
    // O pagamento é reconhecido instantaneamente, então, quando o usuário efetuar o pagamento, o bot será liberado para responder as perguntas
    let instrucao = "Você deve identificar a função que o cliente deseja chamar.";

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
        else if (lastTenMessages[i].remetente === 2) {
            mensagem.push({
                role: 'assistant',
                content: lastTenMessages[i].mensagem
            });
        }
        else {
            mensagem.push({
                role: 'system',
                content: lastTenMessages[i].mensagem
            });
        }
    }

    const functions = [];
    const functionsDB = await Function.findAll();
    for (let i = 0; i < functionsDB.length; i++) {
        functions.push({
            "name": functionsDB[i].nome,
            "description": functionsDB[i].descricao,
            "parameters": {
                "type": "object",
                "properties": {
                    "key": {
                        "type": "string",
                        "description": "key used to call the function sent by the user"
                    }
                },
                "required": ["key"]
            }
        });
    }

    const data = JSON.stringify({
        "model": "gpt-3.5-turbo-16k",
        "messages": mensagem,
        "functions": functions,
        "function_call": "true",
        "max_tokens": 2000,
        "temperature": 1,
        "top_p": 1,
        "frequency_penalty": 0,
        "presence_penalty": 0
    });

    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
            'Authorization': `Bearer ${API_KEY_IA}`,
            'Content-Type': 'application/json'
        },
        data: data
    };


    try {
        const response = await axios(config);
        const resposta = response.data.choices[0].message.content;
        const responseMessage = response.data.choices[0].message;

        if (responseMessage.function_call) {
            const args = JSON.parse(responseMessage.function_call.arguments);
            console.log(args);
            const functionDB = await Function.findOne({
                where: {
                    nome: responseMessage.function_call.name
                }
            });

            if (!functionDB) {
                return "Desculpe, não encontrei a função que você solicitou.";
            }

            const message = functionDB.mensagem;
        
        } else {
            return resposta;
        }
    } catch (error) {
        console.error(error);
        return "Desculpe, não entendi!";
    }
}



module.exports = { processWithFunctions };
