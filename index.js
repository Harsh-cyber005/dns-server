const dgram = require('node:dgram');
const dnsPacket = require('dns-packet');

const server = dgram.createSocket('udp4');

const db = {
    'harshmax.dev': {
        type: 'A',
        data: '192.168.127.12'
    },
    'blog.harshmax.dev': {
        type: 'CNAME',
        data: 'hashnode.network'
    },
    'hashnode.network': {
        type: 'A',
        data: '192.168.127.12'
    },
    'hashnode.dev':{
        type: 'A',
        data: '192.168.127.14'
    },
    'hashnode.io':{
        type: 'A',
        data: '192.168.127.15'
    },
    'app.harshmax.dev':{
        type: 'CNAME',
        data: 'hashnode.network'
    },
    '100x.app.harshmax.dev':{
        type: 'CNAME',
        data: 'app.harshmax.dev'
    }
}

server.on('error', (err) => {
    console.error('Server error:', err);
    server.close();
});

server.on('message',(msg, rinfo) => {
    const incomingReq = dnsPacket.decode(msg);
    const name = incomingReq.questions[0].name;
    const ipFromDb = db[name];

    if(!ipFromDb) {
        const ans = dnsPacket.encode({
            type: 'response',
            id: incomingReq.id,
            flags: dnsPacket.AUTHORITATIVE_ANSWER,
            questions: incomingReq.questions,
            answers: []
        })

        server.send(ans, rinfo.port, rinfo.address)
        return;
    }

    var type = ipFromDb.type;
    var data = ipFromDb.data;
    const finalAnswers = [{
        type: ipFromDb.type,
        class: 'IN',
        name: name,
        data: ipFromDb.data
    }];
    
    while(type === 'CNAME'){
        const cname = db[data]
        if(!cname) {
            break;
        }
        const ctype = cname.type;
        const cdata = cname.data;

        const cans = {
            type: ctype,
            class: 'IN',
            name: data,
            data: cdata
        }
        
        finalAnswers.push(cans);

        type = ctype;
        data = cdata;
    }

    const ans = dnsPacket.encode({
        type: 'response',
        id: incomingReq.id,
        flags: dnsPacket.AUTHORITATIVE_ANSWER,
        questions: incomingReq.questions,
        answers: finalAnswers
    })

    server.send(ans, rinfo.port, rinfo.address)
})

server.bind(8080, ()=>{
    console.log('my dns server is running on port 8080');
})