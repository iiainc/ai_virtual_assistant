const express = require('express');
const bodyParser = require('body-parser');
const AsteriskManager = require('asterisk-manager');
var cors = require('cors')

var https = require('https');
var fs = require("fs");

const app = express();
const port = 8443;

// Set up Asterisk Manager connection
const ami = new AsteriskManager(5038, 'localhost', 'admin', 'password', true);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());
app.use(express.json());

// Route to handle the form submission
app.post('/book', (req, res) => {
    const phoneNumber = req.body.phoneNumber;
    console.log(`request: ${req.body}`)
    console.log(`phone number received:${phoneNumber} `);

    if (!phoneNumber) {
        return res.status(400).send('Phone number is required');
    }

    // Dial out using Asterisk
    ami.action({
        Action: 'Originate',
        Channel: `PJSIP/${phoneNumber}@twilio-na-us`,
        Context: 'from-internal',
        Exten: '550',
        Priority: 1,
        CallerID: <caller-id>,
        Timeout: 30000
    }, (err, res) => {
        if (err) {
            console.error('Asterisk Error:', err);
            console.log('Asterisk Error:');
            return res.status(500).send('Error making call');
        }
        console.log('Call initiated:', res);
        //res.send('Call initiated to ' + phoneNumber);
	//return res.status(200).send('Call initiated to ' + phoneNumber);
	//return res.sendStatus(200);
    });
	return res.sendStatus(200);
});


// file location of private key
var privateKey = fs.readFileSync( '<private-key.pem>' );

// file location of SSL cert
var certificate = fs.readFileSync( '<cert.pem>' );

// set up a config object
var server_config = {
    key : privateKey,
    cert: certificate
};

// create the HTTPS server on port 443
var https_server = https.createServer(server_config, app).listen(8443, function(err){
    console.log("Node.js Express HTTPS Server Listening on Port 8443");
});


// Start server
//app.listen(port, () => {
 //   console.log(`Server running at http://localhost:${port}`);
//});

