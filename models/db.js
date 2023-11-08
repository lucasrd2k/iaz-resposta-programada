
const Sequelize = require('sequelize');

const sequelize = new Sequelize("iazasaas", "zinzer", "senhaZinzerDev2023", {
    host: '127.0.0.1',
    dialect: 'mysql',
    define: {
        freezeTableName: true
    },
    logging:false
});


sequelize.authenticate()
    .then(function() {
        console.log("Conexão com o banco de dados realizada com sucesso!");
    }).catch(function(erro) {
        console.log("Erro: Conexão com o banco de dados não realizada com sucesso!"+erro);
    });

module.exports = sequelize;
