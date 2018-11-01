const getClientAddress = req => {
    let address = req.headers['x-client-ip']
    let lookupKeys = [ 'x-real-ip', 'x-cluster-client-ip', 'x-forwarded', 'forwarded-for', 'forwarded' ]
    let forwardedForAlternative = req.headers['x-forwarded-for']

    if (address) return address
    if (forwardedForAlternative) return forwardedForAlternative.split(',')[0]

    for (let index = 0, len = lookupKeys.length; index < len; index++) {
        let header = req.headers[lookupKeys[index]]
        if (header) return header
    }

    if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress
    if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress
    if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) return req.connection.socket.remoteAddress
    if (req.info && req.info.remoteAddress) return req.info.remoteAddress

    return null
}

getClientAddress.v4 = req => {
    let ip = getClientAddress(req)
    return ip.length < 15 ? ip : (ip.substr(0, 7) === '::ffff:' ? ip.substr(7) : null)
}

module.exports = getClientAddress