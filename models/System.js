const Sequelize = require('sequelize');
const db = require('./db.js');

// temperature: 1.5,
// max_tokens: 16009,
// top_p: 1,
// frequency_penalty: 0,
// presence_penalty: 0,
const System = db.define('system', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    instancia: {
        type: Sequelize.STRING,
        allowNull: false
    },
    instrucao: {
        type: Sequelize.TEXT,
        allowNull: false
    }
});

//Criar a tabela
System.sync();
//Verificar se há alguma diferença na tabela, realiza a alteração
//System.sync({ alter: true })

module.exports = System;
