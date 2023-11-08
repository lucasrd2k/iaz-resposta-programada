const Sequelize = require('sequelize');
const db = require('./db.js');

const Function = db.define('funcao', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    nome: {
        type: Sequelize.STRING,
        allowNull: false
    },
    descricao: {
        type: Sequelize.STRING,
        allowNull: false
    },
    mensagem: {
        type: Sequelize.STRING,
        allowNull: false
    }
});

//Criar a tabela
Function.sync();
//Verificar se há alguma diferença na tabela, realiza a alteração
//Function.sync({ alter: true })

module.exports = Function;