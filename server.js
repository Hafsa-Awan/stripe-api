const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Use your Stripe secret key
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());

app.use(bodyParser.json());
app.use(cors());

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        project_id: 'leebi-83d05',
        private_key_id: process.env.PRIVATE_KEY_ID,
        private_key: process.env.PRIVATE_KEY,
        client_email: process.env.CLIENT_EMAIL,
        client_id: process.env.CLIENT_ID,
        auth_uri: process.env.AUTH_URI,
        token_uri: process.env.TOKEN_URI,
        auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_CERT_URL,
        client_x509_cert_url: process.env.CLIENT_CERT_URL
    }),
    databaseURL: process.env.DATABASE_URL
});

// Create a customer
app.post('/create-customer', async (req, res) => {
    const { uid, email } = req.body;

    try {
        const customer = await stripe.customers.create({ email });

        // Store the customer ID in Firebase Realtime Database
        await admin.database().ref(`stripeCustomers/${uid}`).set({
            customerId: customer.id,
            email: email
        });

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
