const express = require('express');
const axios = require('axios').create({
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
});


const router = express.Router();

const Cliente = require('../models/Cliente');
const Payment = require('../models/Payment'); // id,id_asaas,status,usuario
const User = require('../models/User');
router.post('/webhook', async (req, res) => {
    console.log('Webhook recebido!');
    // {
    //     "event":"PAYMENT_RECEIVED",
    //     "payment":{
    //        "object":"payment",
    //        "id":"pay_080225913252",
    //        "dateCreated":"2021-01-01",
    //        "customer":"cus_G7Dvo4iphUNk",
    if (req.body.event === "PAYMENT_RECEIVED") {
        const id_asaas = req.body.payment.customer;
        const cliente = await Cliente.findOne({
            where: {
                id_asaas: id_asaas
            }
        });

        if (cliente) {
            // Buscar payment se houver e atualizar o status pra 0
            const payment = await Payment.findOne({
                where: {
                    id_asaas: req.body.payment.id
                }
            });
            if (payment) {
                payment.status = 0;
                await payment.save();
            }

            const status = 1;
            const usuario = cliente.usuario;
            await Payment.create({
                id_asaas,
                status,
                usuario
            });
            // Buscar usuario
            const user = await User.findOne({
                where: {
                    id: usuario
                }
            });
            // Enviar mensagem para o usuario usando o bot
            //         let clientId = 'IAZ';
            // let number = '556284208957';
            // let message = 'teste';
            // //Enviar rota /send-message
            // await axios.post('https://mapapun.com:4000/send-message', {
            //     clientId,
            //     number,
            //     message
            // });
            // Enviar mensagem para o usuario usando o bot
            let idSystem = user.bot;
            const system = await System.findOne({
                where: {
                    id: idSystem
                }
            });

            let clientId = system.instancia;
            let number = user.phone;
            let message = 'Parabéns, seu pagamento foi confirmado!\n\nAgora você pode aproveitar toda a praticidade da inteligência artificial ilimitadamente.';

            //Enviar rota /send-message
            await axios.post('https://mapapun.com:4000/send-message', {
                clientId,
                number,
                message
            });
        }
    }
    res.status(200).json({
        status: true,
    });
});

module.exports = router;