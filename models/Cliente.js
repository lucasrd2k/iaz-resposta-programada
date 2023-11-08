const Sequelize = require('sequelize');
const db = require('./db.js');

const Cliente = db.define('cliente', {
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
    cpf : {
        type: Sequelize.STRING,
        allowNull: false,
    },
    mobilePhone: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    id_asaas: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    usuario: {
        type: Sequelize.INTEGER,
        references: {
            model: 'usuario',
            key: 'id'
        }
    }
});


//O tipo de usuário é tipo 0 = cliente, 1 = admin
//Criar a tabela
Cliente.sync();
//Verificar se há alguma diferença na tabela, realiza a alteração
//Cliente.sync({ alter: true })

module.exports = Cliente;