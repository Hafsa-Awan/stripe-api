const express = require('express');
const stripe = require('stripe')('sk_test_51Pn1wHFAgp4jVYokihnrDgKJWoDqBPxXfqPtcHlX2PRAfLPQ61pV8qdiMb3GrrApVU2sDGtexQSIgImUlnl1ZAC400Jzy7Tf64');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

// Create a customer
app.post('/create-customer', async (req, res) => {
    const { email } = req.body;

    try {
        const customer = await stripe.customers.create({ email });
        res.status(200).send({ customerId: customer.id });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Attach a payment method to a customer
app.post('/attach-payment-method', async (req, res) => {
    const { paymentMethodId, customerId } = req.body;

    try {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
        await stripe.customers.update(customerId, {
            invoice_settings: {
                default_payment_method: paymentMethodId,
            },
        });

        res.status(200).send({ success: true });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Retrieve saved payment methods
app.post('/list-payment-methods', async (req, res) => {
    const { customerId } = req.body;

    try {
        const paymentMethods = await stripe.paymentMethods.list({
            customer: customerId,
            type: 'card',
        });

        res.status(200).send(paymentMethods);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Create a payment intent
app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, customerId, paymentMethodId } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            customer: customerId,
            payment_method: paymentMethodId,
            off_session: true,
            confirm: true,
        });

        res.status(200).send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
