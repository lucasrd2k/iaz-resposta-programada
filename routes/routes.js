const express = require('express');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const System = require('../models/System'); // Substitua pelo caminho correto do seu modelo System
const User = require('../models/User'); // Substitua pelo caminho correto do seu modelo User
const MessageMedia = require('whatsapp-web.js').MessageMedia; // Substitua pelo caminho correto do seu módulo MessageMedia
const Message = require('../models/Message'); 
const router = express.Router();
const Function = require('../models/Function'); // nome, descricao, texto,

// Rota cadastro de função
router.post('/function', async (req, res) => {
    const nome = req.body.nome;
    const descricao = req.body.descricao;
    const texto = req.body.texto;

    try {
        const newFunction = await Function.create({
            nome,
            descricao,
            texto
        });
        res.status(200).json({
            status: true,
            message: 'Função cadastrada com sucesso!',
            function: newFunction
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao cadastrar a função: ' + error
        });
    }
});

// Excluir função
router.delete('/function/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const functionDeleted = await Function.destroy({
            where: {
                id: id
            }
        });
        res.status(200).json({
            status: true,
            message: 'Função excluída com sucesso!',
            function: functionDeleted
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao excluir a função: ' + error
        });
    }
});

// Editar função ( 1 ou mais campos )
router.put('/function/:id', async (req, res) => {
    const id = req.params.id;
    const nome = req.body.nome;
    const descricao = req.body.descricao;
    const texto = req.body.texto;
    if (nome === undefined && descricao === undefined && texto === undefined) {
        res.status(400).json({
            status: false,
            message: 'Nenhum campo informado!'
        });
    }
    try {
        const functionEditar = await Function.findOne({
            where: {
                id: id
            }
        });
        if (nome !== undefined) {
            functionEditar.nome = nome;
        }
        if (descricao !== undefined) {
            functionEditar.descricao = descricao;
        }
        if (texto !== undefined) {
            functionEditar.texto = texto;
        }

        const functionEdited = await functionEditar.save();
        
        res.status(200).json({
            status: true,
            message: 'Função editada com sucesso!',
            function: functionEdited
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao editar a função: ' + error
        });
    }
});

// Buscar todas as funções
router.get('/functions', async (req, res) => {
    try {
        const functions = await Function.findAll();
        res.status(200).json({
            status: true,
            message: 'Funções encontradas com sucesso!',
            functions: functions
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao buscar as funções: ' + error
        });
    }
});



// Send message
router.post('/zdg-message', [
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
router.post('/zdg-media', [
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

const Sequelize = require('sequelize');
const db = require('../models/db.js');

// temperature: 1.5,
// max_tokens: 16009,
// top_p: 1,
// frequency_penalty: 0,
// presence_penalty: 0,
// const System = db.define('system', {
//     id: {
//         type: Sequelize.INTEGER,
//         autoIncrement: true,
//         allowNull: false,
//         primaryKey: true
//     },
//     instancia: {
//         type: Sequelize.STRING,
//         allowNull: false
//     },
//     instrucao: {
//         type: Sequelize.TEXT,
//         allowNull: false
//     }
// });

//Criar uma rota que recebe uma instrucao

//Criar uma rota que enviará a instrucao
router.get('/instrucao/:id', async (req, res) => {
    //Verificar se existe uma instrucao no banco de dados
    const id = req.params.id;
    if (id === undefined) {
        res.status(400).json({
            status: false,
            message: 'ID não informado!'
        });
    }
    const system = await System.findAll({
        where: {
            id: id
        }
    });
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
        res.status(404).json({
            status: true,
            message: 'Instrução não encontrada!',
            instruction: 'Adicione a instrução aqui'
        });
    }
});

//Criar uma rota que envia todos os bots (system)
router.get('/bots', async (req, res) => {
    //Buscar todos os bots
    try {
        const systems = await System.findAll();
        res.status(200).json({
            status: true,
            message: 'Bots encontrados com sucesso!',
            systems: systems
        });
    } catch (error) {
        res.status(500).json({
            status: false,
            message: 'Erro ao buscar os bots: ' + error
        });
    }
});


//Criar uma rota que busca todos os usuários
router.get('/usuarios', async (req, res) => {
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


module.exports = router;
