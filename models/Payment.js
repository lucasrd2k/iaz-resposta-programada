const Sequelize = require('sequelize');
const db = require('./db.js');

const Payment = db.define('pagamento', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    id_asaas: {
        type: Sequelize.STRING,
        allowNull: false
    },
    status: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    usuario: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
            model: 'usuario',
            key: 'id'
        }
    }
});

//Criar a tabela
Payment.sync();

module.exports = Payment;