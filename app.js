const mongoose = require('mongoose');
const http = require('http');
const url = require('url');

const getIp = require('./utils/getIp');

const Schema = mongoose.Schema;

const PingSchema = new Schema({
    ip: {type: String, unique: true},
    screen: {type: Number, default: -1},
    ipv6: {type: Boolean},
});
mongoose.model('Ping', PingSchema);
const Ping = mongoose.model('Ping', PingSchema);

const getFormatedDate = () => {
    const d = new Date();
    return (d.getUTCMonth()+1)+","+d.getUTCDate()+","+d.getUTCFullYear();
}
const AnalyticsSchema = new Schema({
    date: {type: String, default: getFormatedDate(), unique: true},
    ipv6: {type: Number, default: 0},
    ipv4: {type: Number, default: 0},
});
mongoose.model('Analytics', AnalyticsSchema);
const Analytics = mongoose.model('Analytics', AnalyticsSchema);
const updateAnalytics = (ipv6) => {
    Analytics.findOne({date: getFormatedDate()}, (err, analytic) => {
        if (analytic === null) {
            analytic = new Analytics({date: getFormatedDate()});
        }
        if (ipv6) {
            analytic.ipv6+=1;
        } else {
            analytic.ipv4+=1;
        }
        analytic.save();
    })
}

mongoose.connect('mongodb://localhost/ipv6_vs_ipv4');

const serverHandler = function (req, res) {
    let ip = req.headers['x-real-ip'] || 
	req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    ip = String(ip).replace('::ffff:', '');
    //console.log(getIp(req));

    const query = url.parse(req.url, true).query;

    const screen = query.screen;

    const ping = new Ping({
        ip: ip,
        screen: screen,
        ipv6: (ip.indexOf(':') >= 0)
    })
    if (screen) {
        ping.save((err) => {
            if (!err) {
                if ((ip.indexOf(':') >= 0)) {
                    countUp('ipv6', screen);
                    updateAnalytics(true);
                } else {
                    countUp('ipv4', screen);
                    updateAnalytics(false);
                }
                wssBroadcast(JSON.stringify(['stats', ipStats]));
            }
        });
    }

    res.statusCode = 200;
    //console.log(req.socket.address());
    console.log(ip);
    const response = ipStats;
    response.yourIp = ip;
    res.write(JSON.stringify(ipStats));
    res.end();
}

const server = http.createServer(serverHandler);

server.listen(8080, '::');


//////////////////////////////////////////
//\\\\\\\\\\\\\ Statistics ///////////////
//////////////////////////////////////////

const recorded = [];
const ipStats = {
    ipv4: {
        mobile: 0,
        tablet: 0,
        desktop: 0
    },
    ipv6: {
        mobile: 0,
        tablet: 0,
        desktop: 0
    },
    init: false
}
let statsOffset = 0;

const countUp = (cat, screen) => {
    if (screen < 0) return;
    if (screen < 768) {
        ipStats[cat].mobile++;
    } else if (screen < 1000) {
        ipStats[cat].tablet++;
    } else {
        ipStats[cat].desktop++;
    }
}

const statsHelper = (err, data) => {
    if (data != undefined) {
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            if (recorded.indexOf(element.ip) === -1) {
                recorded.push(element.ip);
                if (element.ipv6) {
                    countUp('ipv6', element.screen);
                } else {
                    countUp('ipv4', element.screen);
                }
            }
        }
    }
    console.log(ipStats);
    ipStats.init = true;
    wssBroadcast(JSON.stringify(['stats', ipStats]));
}
Ping.find({}, statsHelper);



//////////////////////////////////////////
//\\\\\\\\\\\ User Interface /////////////
//\\\\\\\\\\\\  Websockets  //////////////
//////////////////////////////////////////

const WebSocket = require('ws');

const wssBroadcast = (data) => {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws, req) {
    if (ipStats.init) ws.send(JSON.stringify(['stats', ipStats]));
});

function noop() {}
 
function heartbeat() {
    this.isAlive = true;
}
 
wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
});
 
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping(noop);
    });
}, 30000);
