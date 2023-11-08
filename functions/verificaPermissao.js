const Message = require('../models/Message');
const Payment = require('../models/Payment');
const { Op } = require('sequelize');
const sequelize = require('../models/db')
const verificaPermissao = async (id) => {
    const hoje = new Date();
    const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const finalDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

    const messages = await Message.count({
        where: {
            usuario: id,
            remetente: 1,
            createdAt: {
                [Op.gte]: inicioDoDia,
                [Op.lt]: finalDoDia,
            },
        },
    });
    console.log(messages+" mensagens encontradas");
    if (messages < 3) {
        return true;
    } else {
        const payment = await Payment.findOne({
            where: {
                usuario: id,
                status: 1,
                createdAt: {
                    [Op.lte]: hoje,
                },
                [Op.and]: sequelize.literal(`DATE_ADD(createdAt, INTERVAL 1 MONTH) > NOW()`),
            },
        });
        console.log('Pagamento: '+!!payment);

        return !!payment; // isso é um cast para booleano, ou seja, se existir um pagamento, retorna true, se não, retorna false
    }
};

module.exports = verificaPermissao;
