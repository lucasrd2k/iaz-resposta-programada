const Sequelize = require('sequelize');
const db = require('./db.js');

const User = db.define('usuario', {
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
    whatsapp: {
        type: Sequelize.STRING,
        allowNull: false
    },
    tipo : {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
    },
    bot: {
        type: Sequelize.INTEGER,
        references: {
            model: 'system',
            key: 'id'
        }
    }
});




//O tipo de usuário é tipo 0 = cliente, 1 = admin
//Criar a tabela
User.sync();
//Verificar se há alguma diferença na tabela, realiza a alteração
//User.sync({ alter: true })

module.exports = User;

