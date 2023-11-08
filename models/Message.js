const Sequelize = require('sequelize');
const db = require('./db.js');

const Message = db.define('mensagem', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    mensagem: {
        type: Sequelize.TEXT,
        allowNull: false
    },
    remetente: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    usuario: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    bot: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'system',
            key: 'id'
        }
    }      
});

//Criar a tabela
Message.sync();
//Verificar se há alguma diferença na tabela, realiza a alteração
//Message.sync({ alter: true })

module.exports = Message;
