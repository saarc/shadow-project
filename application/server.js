// 외부모듈 포함
const express = require('express');
const app = express();
//var bodyParser = require('body-parser');

const { FileSystemWallet, Gateway, Wallets } = require('fabric-network');

const fs = require('fs');
const path = require('path');

// 서버설정
const PORT = 3000;
const HOST = '0.0.0.0';
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// fabric 연결설정
const ccpPath = path.resolve(__dirname, 'connection-org1.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

// index.html 페이지 라우팅
app.get('/', (req, res)=>{
    res.sendFile(__dirname + '/index.html');
});

// REST 라우팅
// /car POST
app.post('/car', async(req, res)=>{
    
    const carid = req.body.carid;
    const maker = req.body.maker;
    const model = req.body.model;
    const color = req.body.color;
    const owner = req.body.owner;

    console.log('/car-post-'+carid+'-'+maker+'-'+model+'-'+color+'-'+owner)
    
    // 인증서 확인
    const walletPath = path.join(process.cwd(), 'wallet');
    
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    console.log(`Wallet path: ${walletPath}`);

    const identity = await wallet.get('appUser');

    if(!identity) {
        console.log('An identity for the user appUser does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');

        res.status(401).sendFile(__dirname+'/views/uauth.html');
        return;
    }

    // GW -> CH -> CC
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('fabcar');

    await contract.submitTransaction('createCar', carid, maker, model, color, owner);
    console.log('Transaction has been submitted');
    await gateway.disconnect();

    // submit Transaction
    const resultPath = path.join(process.cwd(), '/views/result.html');
    var resultHTML = fs.readFileSync(resultPath, 'utf8');
    resultHTML = resultHTML.replace("<div></div>", "<div><p>Transaction has been submitted</p></div>")
    // result to CLIENT
    res.status(200).send(resultHTML)
    
});

// /car GET
app.get('/car', async(req, res)=>{
    
    //const carid = req.body.carid;
    const carid = req.query.carid;
    
    console.log('/car-get-'+carid)
    
    // 인증서 확인
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);
    const identity = await wallet.get('appUser');
    if(!identity) {
        console.log('An identity for the user appUser does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');

        res.status(401).sendFile(__dirname+'/views/uauth.html');
        return;
    }
    // GW -> CH -> CC
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('fabcar');

    const result = await contract.evaluateTransaction('queryCar', carid);
    console.log(`Transaction has been evaluated, result is: ${result.toString()}`);
    await gateway.disconnect();

    // submit Transaction
    const resultPath = path.join(process.cwd(), '/views/result.html');
    var resultHTML = fs.readFileSync(resultPath, 'utf8');
    //resultHTML = resultHTML.replace("<div></div>", "<div><p>Transaction has been sumitted</p></div>")
    resultHTML = resultHTML.replace("<div></div>", `<div><p>Transaction has been evaluated, result is: ${result.toString()}</p></div>`)
    // result to CLIENT
    res.status(200).send(resultHTML)
});

// 서버시작
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
