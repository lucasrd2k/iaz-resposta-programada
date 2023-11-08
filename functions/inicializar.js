const User = require('../models/User');
const System = require('../models/System');

const inicializar = async (msg, clientId) => {
    //X. Buscar o system correspondente a instancia
    const system = await System.findAll({
        where: {
            instancia: clientId
        }
    });
    if (system.length === 0) {
        console.log('Sistema não encontrado!');
        return false;
    }

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
                return user.id
            } else {
                try {
                    const newUser = await User.create({
                        nome: name,
                        whatsapp: number,
                        tipo: 0,
                        bot: system[0].id
                    });
                    console.log('Usuário cadastrado, mas precisa cadastrar o cliente (asaas)!');
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

    const infos = await registerUser(number, name);
    return infos;
};

module.exports = inicializar;